using KRpt.Core.DTOs;
using KRpt.Core.Entities;
using KRpt.Core.Enums;
using KRpt.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KRpt.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PermissionTreeController : ControllerBase
{
    private readonly AppDbContext _context;

    public PermissionTreeController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<PermissionTreeNodeDto>>> GetTree()
    {
        var nodes = await _context.PermissionTreeNodes
            .Include(n => n.Permissions)
                .ThenInclude(p => p.LockedByUser)
            .Include(n => n.Permissions)
                .ThenInclude(p => p.VerifiedByUser)
            .OrderBy(n => n.SortOrder)
            .ToListAsync();

        var nodeDtos = nodes.Select(n => new PermissionTreeNodeDto
        {
            NodeId = n.NodeId,
            ParentNodeId = n.ParentNodeId,
            Title = n.Title,
            ResourceCode = n.ResourceCode,
            SortOrder = n.SortOrder,
            Description = n.Description,
            CreatedAt = n.CreatedAt,
            UpdatedAt = n.UpdatedAt,
            Permissions = n.Permissions
                .OrderBy(p => p.ResourceNumber)
                .Select(p => new PermissionItemDto
                {
                    PermissionId = p.PermissionId,
                    NodeId = p.NodeId,
                    NodeTitle = n.Title,
                    NodeResourceCode = n.ResourceCode,
                    PersianName = p.PersianName,
                    EnglishName = p.EnglishName,
                    ResourceNumber = p.ResourceNumber,
                    Description = p.Description,
                    Status = p.Status,
                    VerifiedByUserId = p.VerifiedByUserId,
                    VerifiedByUserName = p.VerifiedByUser?.FullName,
                    VerifiedAt = p.VerifiedAt,
                    IsLocked = p.LockedByUserId != null,
                    LockedByUserId = p.LockedByUserId,
                    LockedByUserName = p.LockedByUser?.FullName,
                    LockedAt = p.LockedAt,
                    LockSessionId = p.LockSessionId,
                    CreatedAt = p.CreatedAt,
                    UpdatedAt = p.UpdatedAt
                }).ToList()
        }).ToList();

        // ساخت ساختار درختی نامحدود (Recursive Tree Hierarchy)
        var lookup = nodeDtos.ToLookup(d => d.ParentNodeId);
        foreach (var dto in nodeDtos)
        {
            dto.Children = lookup[dto.NodeId].OrderBy(c => c.SortOrder).ToList();
        }

        // محاسبه آمار دسترسی‌ها به‌صورت بازگشتی برای هر سطح و زیرشاخه‌ها
        void CalculateAggregates(PermissionTreeNodeDto node)
        {
            int total = node.Permissions.Count;
            int verified = node.Permissions.Count(p => p.Status == ReportStatus.Verified);
            int inProgress = node.Permissions.Count(p => p.Status == ReportStatus.InProgress);
            int pending = node.Permissions.Count(p => p.Status == ReportStatus.Pending);
            int locked = node.Permissions.Count(p => p.IsLocked);

            foreach (var child in node.Children)
            {
                CalculateAggregates(child);
                total += child.TotalPermissionsCount;
                verified += child.VerifiedCount;
                inProgress += child.UnderReviewCount;
                pending += child.PendingCount;
                locked += child.LockedCount;
            }

            node.TotalPermissionsCount = total;
            node.VerifiedCount = verified;
            node.UnderReviewCount = inProgress;
            node.PendingCount = pending;
            node.LockedCount = locked;
        }

        var rootNodes = nodeDtos.Where(d => d.ParentNodeId == null).OrderBy(d => d.SortOrder).ToList();
        foreach (var root in rootNodes)
        {
            CalculateAggregates(root);
        }

        return Ok(rootNodes);
    }

    [HttpGet("next-resource-code")]
    public async Task<ActionResult<object>> GetNextResourceCode([FromQuery] int? parentNodeId)
    {
        var codes = await _context.PermissionTreeNodes
            .Where(n => n.ResourceCode != null && n.ResourceCode != "")
            .Select(n => n.ResourceCode!)
            .ToListAsync();

        if (codes.Count == 0)
            return Ok(new { nextCode = "SEC-01" });

        long maxNum = 0;
        string prefix = "SEC-";
        foreach (var c in codes)
        {
            var match = System.Text.RegularExpressions.Regex.Match(c.Trim(), @"^(.*?)(\d+)$");
            if (match.Success)
            {
                prefix = match.Groups[1].Value;
                if (long.TryParse(match.Groups[2].Value, out var n) && n > maxNum)
                {
                    maxNum = n;
                }
            }
        }

        string nextCode = $"{prefix}{(maxNum + 1).ToString("D2")}";
        return Ok(new { nextCode });
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<PermissionTreeNodeDto>> CreateNode([FromBody] CreatePermissionTreeNodeDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { message = "عنوان سطح دسترسی الزامی است." });

        if (dto.ParentNodeId.HasValue)
        {
            var parentExists = await _context.PermissionTreeNodes.AnyAsync(n => n.NodeId == dto.ParentNodeId.Value);
            if (!parentExists)
                return BadRequest(new { message = "سطح والد مورد نظر یافت نشد." });
        }

        int nextSort = dto.SortOrder;
        if (nextSort <= 0)
        {
            var maxSort = await _context.PermissionTreeNodes
                .Where(n => n.ParentNodeId == dto.ParentNodeId)
                .MaxAsync(n => (int?)n.SortOrder) ?? 0;
            nextSort = maxSort + 1;
        }

        var node = new PermissionTreeNode
        {
            ParentNodeId = dto.ParentNodeId,
            Title = dto.Title.Trim(),
            ResourceCode = string.IsNullOrWhiteSpace(dto.ResourceCode) ? null : dto.ResourceCode.Trim(),
            SortOrder = nextSort,
            Description = dto.Description?.Trim(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.PermissionTreeNodes.Add(node);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTree), new { id = node.NodeId }, new PermissionTreeNodeDto
        {
            NodeId = node.NodeId,
            ParentNodeId = node.ParentNodeId,
            Title = node.Title,
            ResourceCode = node.ResourceCode,
            SortOrder = node.SortOrder,
            Description = node.Description,
            CreatedAt = node.CreatedAt,
            UpdatedAt = node.UpdatedAt
        });
    }

    [Authorize]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateNode(int id, [FromBody] UpdatePermissionTreeNodeDto dto)
    {
        var node = await _context.PermissionTreeNodes.FindAsync(id);
        if (node == null)
            return NotFound(new { message = "سطح مورد نظر یافت نشد." });

        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { message = "عنوان سطح دسترسی الزامی است." });

        // انتقال سطح به والد دیگر
        if (dto.ParentNodeId != node.ParentNodeId)
        {
            if (dto.ParentNodeId == id)
                return BadRequest(new { message = "امکان انتساب یک سطح به عنوان زیرمجموعه خودش وجود ندارد." });

            if (dto.ParentNodeId.HasValue)
            {
                var parentExists = await _context.PermissionTreeNodes.AnyAsync(n => n.NodeId == dto.ParentNodeId.Value);
                if (!parentExists)
                    return BadRequest(new { message = "سطح والد انتخابی معتبر نیست." });

                var descendants = await GetDescendantNodeIdsAsync(id);
                if (descendants.Contains(dto.ParentNodeId.Value))
                    return BadRequest(new { message = "امکان انتقال سطح به درون یکی از زیرشاخه‌های خودش وجود ندارد." });
            }

            node.ParentNodeId = dto.ParentNodeId;
        }

        node.Title = dto.Title.Trim();
        node.ResourceCode = string.IsNullOrWhiteSpace(dto.ResourceCode) ? null : dto.ResourceCode.Trim();
        node.SortOrder = dto.SortOrder;
        node.Description = dto.Description?.Trim();
        node.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "سطح دسترسی با موفقیت ویرایش شد." });
    }

    [Authorize]
    [HttpPost("{id}/move")]
    public async Task<IActionResult> MoveNode(int id, [FromQuery] int? targetParentId)
    {
        var node = await _context.PermissionTreeNodes.FindAsync(id);
        if (node == null)
            return NotFound(new { message = "سطح مورد نظر یافت نشد." });

        if (targetParentId == id)
            return BadRequest(new { message = "امکان انتساب یک سطح به عنوان زیرمجموعه خودش وجود ندارد." });

        if (targetParentId.HasValue)
        {
            var parentExists = await _context.PermissionTreeNodes.AnyAsync(n => n.NodeId == targetParentId.Value);
            if (!parentExists)
                return BadRequest(new { message = "سطح والد انتخابی معتبر نیست." });

            var descendants = await GetDescendantNodeIdsAsync(id);
            if (descendants.Contains(targetParentId.Value))
                return BadRequest(new { message = "امکان انتقال سطح به درون یکی از زیرشاخه‌های خودش وجود ندارد." });
        }

        node.ParentNodeId = targetParentId;
        node.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "سطح با موفقیت به مکان جدید منتقل شد." });
    }

    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteNode(int id)
    {
        var node = await _context.PermissionTreeNodes
            .Include(n => n.Children)
            .Include(n => n.Permissions)
            .FirstOrDefaultAsync(n => n.NodeId == id);

        if (node == null)
            return NotFound(new { message = "سطح مورد نظر یافت نشد." });

        // حذف بازگشتی زیرشاخه‌ها
        await DeleteSubtreeAsync(id);

        _context.PermissionTreeNodes.Remove(node);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "سطح و کلیه زیرشاخه‌ها با موفقیت حذف شدند." });
    }

    private async Task<List<int>> GetDescendantNodeIdsAsync(int parentId)
    {
        var results = new List<int>();
        var queue = new Queue<int>();
        queue.Enqueue(parentId);

        while (queue.Count > 0)
        {
            var current = queue.Dequeue();
            var children = await _context.PermissionTreeNodes
                .Where(n => n.ParentNodeId == current)
                .Select(n => n.NodeId)
                .ToListAsync();

            foreach (var childId in children)
            {
                results.Add(childId);
                queue.Enqueue(childId);
            }
        }

        return results;
    }

    private async Task DeleteSubtreeAsync(int parentId)
    {
        var children = await _context.PermissionTreeNodes
            .Where(n => n.ParentNodeId == parentId)
            .ToListAsync();

        foreach (var child in children)
        {
            await DeleteSubtreeAsync(child.NodeId);
            _context.PermissionTreeNodes.Remove(child);
        }
    }
}
