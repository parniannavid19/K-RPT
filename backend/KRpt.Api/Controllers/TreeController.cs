using KRpt.Core.DTOs;
using KRpt.Core.Entities;
using KRpt.Core.Enums;
using KRpt.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KRpt.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TreeController : ControllerBase
{
    private readonly AppDbContext _context;

    public TreeController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<TreeNodeDto>>> GetTree()
    {
        var nodes = await _context.ReportTreeNodes
            .Include(n => n.Report)
                .ThenInclude(r => r!.LockedByUser)
            .OrderBy(n => n.SortOrder)
            .ToListAsync();

        var dtos = nodes.Select(n => new TreeNodeDto
        {
            NodeId = n.NodeId,
            ParentNodeId = n.ParentNodeId,
            Title = n.Title,
            NodeType = n.NodeType,
            SortOrder = n.SortOrder,
            ReportId = n.Report?.ReportId,
            ReportCode = n.Report?.ReportCode,
            Status = n.Report?.Status,
            IsLocked = n.Report?.LockedByUserId != null,
            LockedByUserName = n.Report?.LockedByUser?.FullName
        }).ToList();

        var lookup = dtos.ToLookup(d => d.ParentNodeId);
        foreach (var dto in dtos)
        {
            dto.Children = lookup[dto.NodeId]
                .OrderBy(c => c.NodeType == TreeNodeType.Folder ? 0 : 1)
                .ThenBy(c => c.NodeType == TreeNodeType.Report && long.TryParse(c.ReportCode, out var num) ? num : (long)c.SortOrder)
                .ThenBy(c => c.SortOrder)
                .ToList();
        }

        var rootNodes = dtos.Where(d => d.ParentNodeId == null)
            .OrderBy(d => d.NodeType == TreeNodeType.Folder ? 0 : 1)
            .ThenBy(d => d.NodeType == TreeNodeType.Report && long.TryParse(d.ReportCode, out var num) ? num : (long)d.SortOrder)
            .ThenBy(d => d.SortOrder)
            .ToList();
        return Ok(rootNodes);
    }

    [HttpGet("next-code")]
    public async Task<ActionResult<object>> GetNextReportCode()
    {
        var codes = await _context.Reports
            .Where(r => r.ReportCode != null && r.ReportCode != "")
            .Select(r => r.ReportCode)
            .ToListAsync();

        if (codes.Count == 0)
            return Ok(new { nextCode = "1" });

        // ۱. بررسی کدهای کاملاً عددی (مانند ۱، ۲، ۱۲ و ...)
        var numericList = new List<long>();
        foreach (var c in codes)
        {
            if (long.TryParse(c.Trim(), out var val))
            {
                numericList.Add(val);
            }
        }

        if (numericList.Count > 0)
        {
            var maxVal = numericList.Max();
            return Ok(new { nextCode = (maxVal + 1).ToString() });
        }

        // ۲. بررسی کدهای دارای پیشوند متنی (مانند FIN-RPT-205)
        string maxPrefix = "";
        long maxSuffix = -1;
        int padLen = 0;

        foreach (var c in codes)
        {
            var match = System.Text.RegularExpressions.Regex.Match(c.Trim(), @"^(.*?)(\d+)$");
            if (match.Success)
            {
                var prefix = match.Groups[1].Value;
                var numStr = match.Groups[2].Value;
                if (long.TryParse(numStr, out var num) && num > maxSuffix)
                {
                    maxSuffix = num;
                    maxPrefix = prefix;
                    padLen = numStr.Length;
                }
            }
        }

        if (maxSuffix >= 0)
        {
            var nextVal = (maxSuffix + 1).ToString().PadLeft(padLen, '0');
            return Ok(new { nextCode = $"{maxPrefix}{nextVal}" });
        }

        return Ok(new { nextCode = "1" });
    }

    [HttpPost("node")]
    public async Task<ActionResult<TreeNodeDto>> CreateNode([FromBody] CreateTreeNodeDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { message = "عنوان الزامی است." });

        if (dto.NodeType == TreeNodeType.Report && string.IsNullOrWhiteSpace(dto.ReportCode))
            return BadRequest(new { message = "برای گزارش، کد گزارش الزامی است." });

        // بررسی تکراری نبودن کد گزارش
        if (dto.NodeType == TreeNodeType.Report)
        {
            var exists = await _context.Reports.AnyAsync(r => r.ReportCode == dto.ReportCode);
            if (exists)
                return Conflict(new { message = "کد گزارش تکراری است." });
        }

        var maxSort = await _context.ReportTreeNodes
            .Where(n => n.ParentNodeId == dto.ParentNodeId)
            .MaxAsync(n => (int?)n.SortOrder) ?? 0;

        var node = new ReportTreeNode
        {
            ParentNodeId = dto.ParentNodeId,
            Title = dto.Title.Trim(),
            NodeType = dto.NodeType,
            SortOrder = maxSort + 1
        };

        _context.ReportTreeNodes.Add(node);
        await _context.SaveChangesAsync();

        Report? report = null;
        if (dto.NodeType == TreeNodeType.Report)
        {
            report = new Report
            {
                NodeId = node.NodeId,
                ReportCode = dto.ReportCode!.Trim(),
                Title = dto.Title.Trim(),
                FunctionalDescription = dto.FunctionalDescription,
                CalculationFormula = dto.CalculationFormula,
                Status = ReportStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Reports.Add(report);
            await _context.SaveChangesAsync();

            // مرتب‌سازی هوشمند موقعیت بر اساس شماره گزارش
            var siblings = await _context.ReportTreeNodes
                .Include(n => n.Report)
                .Where(n => n.ParentNodeId == dto.ParentNodeId)
                .ToListAsync();

            var sorted = siblings
                .OrderBy(n => n.NodeType == TreeNodeType.Folder ? 0 : 1)
                .ThenBy(n => n.NodeType == TreeNodeType.Report && n.Report != null && long.TryParse(n.Report.ReportCode, out var num) ? num : (long)n.SortOrder)
                .ThenBy(n => n.SortOrder)
                .ToList();

            for (int i = 0; i < sorted.Count; i++)
            {
                sorted[i].SortOrder = i + 1;
            }
            await _context.SaveChangesAsync();
        }

        return Ok(new TreeNodeDto
        {
            NodeId = node.NodeId,
            ParentNodeId = node.ParentNodeId,
            Title = node.Title,
            NodeType = node.NodeType,
            SortOrder = node.SortOrder,
            ReportId = report?.ReportId,
            ReportCode = report?.ReportCode,
            Status = report?.Status,
            IsLocked = false
        });
    }

    [HttpPut("node/{id}")]
    public async Task<IActionResult> UpdateNode(int id, [FromBody] CreateTreeNodeDto dto)
    {
        var node = await _context.ReportTreeNodes
            .Include(n => n.Report)
            .FirstOrDefaultAsync(n => n.NodeId == id);

        if (node == null)
            return NotFound();

        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { message = "عنوان الزامی است." });

        node.Title = dto.Title.Trim();

        // به‌روزرسانی مشخصات گزارش متصل در صورت وجود
        if (node.Report != null)
        {
            node.Report.Title = dto.Title.Trim();
            if (!string.IsNullOrWhiteSpace(dto.ReportCode) && dto.ReportCode.Trim() != node.Report.ReportCode)
            {
                var exists = await _context.Reports.AnyAsync(r => r.ReportCode == dto.ReportCode.Trim() && r.ReportId != node.Report.ReportId);
                if (exists)
                    return Conflict(new { message = "این کد گزارش قبلاً برای گزارش دیگری ثبت شده است." });
                node.Report.ReportCode = dto.ReportCode.Trim();
            }
            node.Report.UpdatedAt = DateTime.UtcNow;
        }

        // جابه‌جایی ماژول یا گزارش به والد جدید
        var oldParentId = node.ParentNodeId;
        var parentChanged = dto.ParentNodeId != oldParentId;

        if (parentChanged)
        {
            // شاخه نمی‌تواند والد خودش باشد
            if (dto.ParentNodeId == node.NodeId)
            {
                return BadRequest(new { message = "یک شاخه نمی‌تواند والد خودش باشد." });
            }

            if (dto.ParentNodeId.HasValue)
            {
                // بررسی اینکه والد مقصد در زیرمجموعه این نود نباشد (جلوگیری از دور و چرخه در درختواره)
                var descendants = await GetDescendantNodeIds(node.NodeId);
                if (descendants.Contains(dto.ParentNodeId.Value))
                {
                    return BadRequest(new { message = "انتقال یک ماژول به زیرمجموعه‌های خودش امکان‌پذیر نیست." });
                }

                var targetParent = await _context.ReportTreeNodes.FindAsync(dto.ParentNodeId.Value);
                if (targetParent == null || targetParent.NodeType != TreeNodeType.Folder)
                {
                    return BadRequest(new { message = "ماژول مقصد یافت نشد یا معتبر نیست." });
                }
            }

            node.ParentNodeId = dto.ParentNodeId;
        }

        // مرتب‌سازی بر اساس شماره کد گزارش در والد مقصد (عدم رفتن به انتهای لیست و قرارگیری دقیق در جایگاه عددی)
        var destinationSiblings = await _context.ReportTreeNodes
            .Include(n => n.Report)
            .Where(n => n.ParentNodeId == node.ParentNodeId && n.NodeId != node.NodeId)
            .ToListAsync();

        destinationSiblings.Add(node);

        var sortedList = destinationSiblings
            .OrderBy(n => n.NodeType == TreeNodeType.Folder ? 0 : 1)
            .ThenBy(n => n.NodeType == TreeNodeType.Report && n.Report != null && long.TryParse(n.Report.ReportCode, out var num) ? num : (long)n.SortOrder)
            .ThenBy(n => n.SortOrder)
            .ToList();

        for (int i = 0; i < sortedList.Count; i++)
        {
            sortedList[i].SortOrder = i + 1;
        }

        // اگر والد تغییر کرده است، هم‌ردیف‌های والد قبلی نیز مجدداً شماره‌گذاری شوند
        if (parentChanged)
        {
            var oldSiblings = await _context.ReportTreeNodes
                .Include(n => n.Report)
                .Where(n => n.ParentNodeId == oldParentId)
                .ToListAsync();

            var sortedOld = oldSiblings
                .OrderBy(n => n.NodeType == TreeNodeType.Folder ? 0 : 1)
                .ThenBy(n => n.NodeType == TreeNodeType.Report && n.Report != null && long.TryParse(n.Report.ReportCode, out var num) ? num : (long)n.SortOrder)
                .ThenBy(n => n.SortOrder)
                .ToList();

            for (int i = 0; i < sortedOld.Count; i++)
            {
                sortedOld[i].SortOrder = i + 1;
            }
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "آیتم با موفقیت ویرایش و منتقل شد." });
    }

    [HttpPost("swap")]
    public async Task<IActionResult> SwapNodes([FromBody] SwapNodesDto dto)
    {
        if (dto.SourceNodeId == dto.TargetNodeId)
            return BadRequest(new { message = "نمی‌توان یک گزارش را با خودش سواپ کرد." });

        var sourceNode = await _context.ReportTreeNodes
            .Include(n => n.Report)
            .FirstOrDefaultAsync(n => n.NodeId == dto.SourceNodeId);

        var targetNode = await _context.ReportTreeNodes
            .Include(n => n.Report)
            .FirstOrDefaultAsync(n => n.NodeId == dto.TargetNodeId);

        if (sourceNode == null || targetNode == null)
            return NotFound(new { message = "گزارش مبدأ یا مقصد یافت نشد." });

        // ۱. سواپ کدهای گزارش (ReportCode)
        if (dto.SwapCodes && sourceNode.Report != null && targetNode.Report != null)
        {
            var codeA = sourceNode.Report.ReportCode;
            var codeB = targetNode.Report.ReportCode;

            var tempCode = $"__SWAP_TMP_{Guid.NewGuid():N}__";
            sourceNode.Report.ReportCode = tempCode;
            await _context.SaveChangesAsync();

            targetNode.Report.ReportCode = codeA;
            await _context.SaveChangesAsync();

            sourceNode.Report.ReportCode = codeB;
            await _context.SaveChangesAsync();
        }

        // ۲. سواپ والد و موقعیت شاخه (Positions)
        if (dto.SwapPositions)
        {
            var parentA = sourceNode.ParentNodeId;
            var parentB = targetNode.ParentNodeId;

            var sortA = sourceNode.SortOrder;
            var sortB = targetNode.SortOrder;

            sourceNode.ParentNodeId = parentB;
            sourceNode.SortOrder = sortB;

            targetNode.ParentNodeId = parentA;
            targetNode.SortOrder = sortA;

            await _context.SaveChangesAsync();
        }

        // ۳. مرتب‌سازی مجدد و منسجم هم‌ردیف‌ها در والدها
        var affectedParentIds = new HashSet<int?> { sourceNode.ParentNodeId, targetNode.ParentNodeId };
        foreach (var pId in affectedParentIds)
        {
            var siblings = await _context.ReportTreeNodes
                .Include(n => n.Report)
                .Where(n => n.ParentNodeId == pId)
                .ToListAsync();

            var sorted = siblings
                .OrderBy(n => n.NodeType == TreeNodeType.Folder ? 0 : 1)
                .ThenBy(n => n.NodeType == TreeNodeType.Report && n.Report != null && long.TryParse(n.Report.ReportCode, out var num) ? num : (long)n.SortOrder)
                .ThenBy(n => n.SortOrder)
                .ToList();

            for (int i = 0; i < sorted.Count; i++)
            {
                sorted[i].SortOrder = i + 1;
            }
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "سواپ و جابه‌جایی گزارش‌ها با موفقیت انجام شد." });
    }

    [HttpPost("node/{id}/move")]
    public async Task<IActionResult> MoveNode(int id, [FromQuery] string direction) // "up" or "down"
    {
        var node = await _context.ReportTreeNodes.FindAsync(id);
        if (node == null) return NotFound();

        var siblings = await _context.ReportTreeNodes
            .Where(n => n.ParentNodeId == node.ParentNodeId)
            .OrderBy(n => n.SortOrder)
            .ToListAsync();

        var index = siblings.FindIndex(n => n.NodeId == id);
        if (index == -1) return NotFound();

        if (direction?.ToLower() == "up" && index > 0)
        {
            var prev = siblings[index - 1];
            (node.SortOrder, prev.SortOrder) = (prev.SortOrder, node.SortOrder);
            if (node.SortOrder == prev.SortOrder)
            {
                prev.SortOrder = index + 1;
                node.SortOrder = index;
            }
            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }
        else if (direction?.ToLower() == "down" && index < siblings.Count - 1)
        {
            var next = siblings[index + 1];
            (node.SortOrder, next.SortOrder) = (next.SortOrder, node.SortOrder);
            if (node.SortOrder == next.SortOrder)
            {
                node.SortOrder = index + 2;
                next.SortOrder = index + 1;
            }
            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        return BadRequest(new { message = "امکان جابه‌جایی در این جهت وجود ندارد." });
    }

    private async Task<List<int>> GetDescendantNodeIds(int nodeId)
    {
        var result = new List<int>();
        var queue = new Queue<int>();
        queue.Enqueue(nodeId);

        while (queue.Count > 0)
        {
            var current = queue.Dequeue();
            var children = await _context.ReportTreeNodes
                .Where(n => n.ParentNodeId == current)
                .Select(n => n.NodeId)
                .ToListAsync();

            foreach (var childId in children)
            {
                result.Add(childId);
                queue.Enqueue(childId);
            }
        }

        return result;
    }

    [HttpDelete("node/{id}")]
    public async Task<IActionResult> DeleteNode(int id)
    {
        var node = await _context.ReportTreeNodes
            .Include(n => n.Children)
            .Include(n => n.Report)
            .FirstOrDefaultAsync(n => n.NodeId == id);

        if (node == null)
            return NotFound();

        if (node.Children.Any())
            return BadRequest(new { message = "این شاخه دارای زیرمجموعه است و ابتدا باید زیرمجموعه‌های آن حذف یا منتقل شوند." });

        if (node.Report != null)
        {
            _context.Reports.Remove(node.Report);
        }

        _context.ReportTreeNodes.Remove(node);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "آیتم با موفقیت حذف شد." });
    }
}
