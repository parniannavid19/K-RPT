using System.Security.Claims;
using KRpt.Api.Hubs;
using KRpt.Core.DTOs;
using KRpt.Core.Entities;
using KRpt.Core.Enums;
using KRpt.Infrastructure.Data;
using KRpt.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace KRpt.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PermissionsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IPermissionLockService _lockService;
    private readonly IHubContext<ReportLockHub> _hubContext;

    public PermissionsController(
        AppDbContext context,
        IPermissionLockService lockService,
        IHubContext<ReportLockHub> hubContext)
    {
        _context = context;
        _lockService = lockService;
        _hubContext = hubContext;
    }

    [HttpGet("by-node/{nodeId}")]
    public async Task<ActionResult<List<PermissionItemDto>>> GetByNodeId(int nodeId)
    {
        var permissions = await _context.Permissions
            .Include(p => p.Node)
            .Include(p => p.LockedByUser)
            .Include(p => p.VerifiedByUser)
            .Where(p => p.NodeId == nodeId)
            .OrderBy(p => p.ResourceNumber)
            .ToListAsync();

        var dtos = permissions.Select(p => MapToDto(p)).ToList();
        return Ok(dtos);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<PermissionItemDto>> GetById(int id)
    {
        var permission = await _context.Permissions
            .Include(p => p.Node)
            .Include(p => p.LockedByUser)
            .Include(p => p.VerifiedByUser)
            .FirstOrDefaultAsync(p => p.PermissionId == id);

        if (permission == null)
            return NotFound(new { message = "دسترسی مورد نظر یافت نشد." });

        return Ok(MapToDto(permission));
    }

    [HttpGet("next-code")]
    public async Task<ActionResult<object>> GetNextResourceNumber()
    {
        var codes = await _context.Permissions
            .Where(p => p.ResourceNumber != null && p.ResourceNumber != "")
            .Select(p => p.ResourceNumber)
            .ToListAsync();

        if (codes.Count == 0)
            return Ok(new { nextCode = "1001" });

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

        string prefix = "PERM-";
        long maxSuffix = 0;
        foreach (var c in codes)
        {
            var match = System.Text.RegularExpressions.Regex.Match(c.Trim(), @"^(.*?)(\d+)$");
            if (match.Success)
            {
                prefix = match.Groups[1].Value;
                if (long.TryParse(match.Groups[2].Value, out var n) && n > maxSuffix)
                {
                    maxSuffix = n;
                }
            }
        }

        return Ok(new { nextCode = $"{prefix}{maxSuffix + 1}" });
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<PermissionItemDto>> CreatePermission([FromBody] CreatePermissionItemDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.PersianName))
            return BadRequest(new { message = "نام فارسی دسترسی الزامی است." });

        if (string.IsNullOrWhiteSpace(dto.ResourceNumber))
            return BadRequest(new { message = "شماره منبع دسترسی الزامی است." });

        var nodeExists = await _context.PermissionTreeNodes.AnyAsync(n => n.NodeId == dto.NodeId);
        if (!nodeExists)
            return BadRequest(new { message = "سطح ساختار درختی انتخابی نامعتبر است." });

        var permission = new PermissionItem
        {
            NodeId = dto.NodeId,
            PersianName = dto.PersianName.Trim(),
            EnglishName = string.IsNullOrWhiteSpace(dto.EnglishName) ? null : dto.EnglishName.Trim(),
            ResourceNumber = dto.ResourceNumber.Trim(),
            Description = dto.Description?.Trim(),
            Status = ReportStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Permissions.Add(permission);
        await _context.SaveChangesAsync();

        // Reload with navigation properties
        await _context.Entry(permission).Reference(p => p.Node).LoadAsync();

        return CreatedAtAction(nameof(GetById), new { id = permission.PermissionId }, MapToDto(permission));
    }

    [Authorize]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdatePermission(int id, [FromBody] UpdatePermissionItemDto dto)
    {
        var permission = await _context.Permissions
            .Include(p => p.LockedByUser)
            .FirstOrDefaultAsync(p => p.PermissionId == id);

        if (permission == null)
            return NotFound(new { message = "دسترسی مورد نظر یافت نشد." });

        int currentUserId = GetCurrentUserId();

        // بررسی قفل بودن توسط کاربر دیگر
        var isExpired = permission.LockedByUserId.HasValue &&
                        permission.LockHeartbeatAt.HasValue &&
                        permission.LockHeartbeatAt.Value.AddMinutes(30) < DateTime.UtcNow;

        if (permission.LockedByUserId.HasValue && !isExpired && permission.LockedByUserId != currentUserId)
        {
            var lockedByName = permission.LockedByUser?.FullName ?? "کاربر دیگر";
            return Conflict(new { message = $"این دسترسی هم‌اکنون توسط «{lockedByName}» در حال ویرایش است." });
        }

        if (string.IsNullOrWhiteSpace(dto.PersianName))
            return BadRequest(new { message = "نام فارسی دسترسی الزامی است." });

        if (string.IsNullOrWhiteSpace(dto.ResourceNumber))
            return BadRequest(new { message = "شماره منبع دسترسی الزامی است." });

        if (dto.NodeId.HasValue && dto.NodeId.Value != permission.NodeId)
        {
            var nodeExists = await _context.PermissionTreeNodes.AnyAsync(n => n.NodeId == dto.NodeId.Value);
            if (!nodeExists)
                return BadRequest(new { message = "سطح ساختار درختی انتخابی معتبر نیست." });

            permission.NodeId = dto.NodeId.Value;
        }

        permission.PersianName = dto.PersianName.Trim();
        permission.EnglishName = string.IsNullOrWhiteSpace(dto.EnglishName) ? null : dto.EnglishName.Trim();
        permission.ResourceNumber = dto.ResourceNumber.Trim();
        permission.Description = dto.Description?.Trim();
        permission.Status = ReportStatus.InProgress; // قابل بررسی
        permission.UpdatedAt = DateTime.UtcNow;

        // آزادسازی قفل در هنگام ذخیره
        permission.LockedByUserId = null;
        permission.LockedAt = null;
        permission.LockHeartbeatAt = null;
        permission.LockSessionId = null;

        await _context.SaveChangesAsync();

        // اطلاع‌رسانی SignalR به سایر کلاینت‌ها
        await _hubContext.Clients.All.SendAsync("PermissionLockChanged", new
        {
            permissionId = id,
            isLocked = false,
            lockedByUserName = (string?)null
        });

        return Ok(new { success = true, message = "تغییرات دسترسی با موفقیت ذخیره شد." });
    }

    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePermission(int id)
    {
        var permission = await _context.Permissions.FindAsync(id);
        if (permission == null)
            return NotFound(new { message = "دسترسی مورد نظر یافت نشد." });

        _context.Permissions.Remove(permission);
        await _context.SaveChangesAsync();

        await _hubContext.Clients.All.SendAsync("PermissionDeleted", id);

        return Ok(new { success = true, message = "دسترسی با موفقیت حذف شد." });
    }

    [Authorize]
    [HttpPost("{id}/move")]
    public async Task<IActionResult> MovePermission(int id, [FromQuery] int targetNodeId)
    {
        var permission = await _context.Permissions.FindAsync(id);
        if (permission == null)
            return NotFound(new { message = "دسترسی مورد نظر یافت نشد." });

        var targetNodeExists = await _context.PermissionTreeNodes.AnyAsync(n => n.NodeId == targetNodeId);
        if (!targetNodeExists)
            return BadRequest(new { message = "سطح مقصد انتخابی یافت نشد." });

        permission.NodeId = targetNodeId;
        permission.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await _hubContext.Clients.All.SendAsync("PermissionLockChanged", new
        {
            permissionId = id,
            isLocked = permission.LockedByUserId != null
        });

        return Ok(new { success = true, message = "دسترسی با موفقیت به سطح جدید منتقل شد." });
    }

    [Authorize]
    [HttpPost("{id}/lock")]
    public async Task<IActionResult> AcquireLock(int id)
    {
        try
        {
            int userId = GetCurrentUserId();
            var (success, message, sessionId) = await _lockService.AcquireLockAsync(id, userId);

            if (!success)
                return Conflict(new { message });

            var user = await _context.Users.FindAsync(userId);
            await _hubContext.Clients.All.SendAsync("PermissionLockChanged", new
            {
                permissionId = id,
                isLocked = true,
                lockedByUserName = user?.FullName,
                sessionId
            });

            return Ok(new { success = true, sessionId, message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = $"خطا در تخصیص قفل: {ex.Message}" });
        }
    }

    [Authorize]
    [HttpPost("{id}/unlock")]
    public async Task<IActionResult> ReleaseLock(int id, [FromQuery] Guid? sessionId, [FromQuery] bool force = false)
    {
        int userId = GetCurrentUserId();
        bool isAdmin = User.IsInRole("SystemAdmin");

        var success = await _lockService.ReleaseLockAsync(id, userId, sessionId, force && isAdmin);
        if (!success)
            return BadRequest(new { message = "امکان آزادسازی قفل وجود ندارد." });

        await _hubContext.Clients.All.SendAsync("PermissionLockChanged", new
        {
            permissionId = id,
            isLocked = false,
            lockedByUserName = (string?)null
        });

        return Ok(new { success = true });
    }

    [Authorize]
    [HttpPost("{id}/heartbeat")]
    public async Task<IActionResult> Heartbeat(int id, [FromQuery] Guid sessionId)
    {
        int userId = GetCurrentUserId();
        var success = await _lockService.HeartbeatAsync(id, userId, sessionId);
        if (!success)
            return Conflict(new { message = "نشست قفل منقضی یا نامعتبر است." });

        return Ok(new { success = true });
    }

    [Authorize]
    [HttpPost("{id}/verify")]
    public async Task<IActionResult> VerifyPermission(int id)
    {
        int userId = GetCurrentUserId();
        var permission = await _context.Permissions.FindAsync(id);
        if (permission == null)
            return NotFound(new { message = "دسترسی مورد نظر یافت نشد." });

        permission.Status = ReportStatus.Verified;
        permission.VerifiedByUserId = userId;
        permission.VerifiedAt = DateTime.UtcNow;
        permission.UpdatedAt = DateTime.UtcNow;

        // آزادسازی خودکار قفل با تایید
        permission.LockedByUserId = null;
        permission.LockedAt = null;
        permission.LockHeartbeatAt = null;
        permission.LockSessionId = null;

        await _context.SaveChangesAsync();

        await _hubContext.Clients.All.SendAsync("PermissionVerified", new
        {
            permissionId = id,
            status = ReportStatus.Verified
        });

        await _hubContext.Clients.All.SendAsync("PermissionLockChanged", new
        {
            permissionId = id,
            isLocked = false,
            lockedByUserName = (string?)null
        });

        return Ok(new { success = true, message = "دسترسی با موفقیت تایید شد." });
    }

    private static PermissionItemDto MapToDto(PermissionItem p)
    {
        return new PermissionItemDto
        {
            PermissionId = p.PermissionId,
            NodeId = p.NodeId,
            NodeTitle = p.Node?.Title,
            NodeResourceCode = p.Node?.ResourceCode,
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
        };
    }

    private int GetCurrentUserId()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(idClaim, out var id) ? id : 1;
    }
}
