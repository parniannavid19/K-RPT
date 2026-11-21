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
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IReportLockService _lockService;
    private readonly IHubContext<ReportLockHub> _hubContext;

    public ReportsController(AppDbContext context, IReportLockService lockService, IHubContext<ReportLockHub> hubContext)
    {
        _context = context;
        _lockService = lockService;
        _hubContext = hubContext;
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ReportDetailDto>> GetReportById(int id)
    {
        var report = await _context.Reports
            .Include(r => r.VerifiedByUser)
            .Include(r => r.LockedByUser)
            .Include(r => r.ReportFields)
                .ThenInclude(rf => rf.Field)
            .Include(r => r.Parameters)
            .Include(r => r.ReportTags)
                .ThenInclude(rt => rt.Tag)
            .Include(r => r.SourceRelations)
                .ThenInclude(sr => sr.TargetReport)
            .FirstOrDefaultAsync(r => r.ReportId == id);

        if (report == null)
            return NotFound(new { message = "گزارش مورد نظر یافت نشد." });

        var dto = new ReportDetailDto
        {
            ReportId = report.ReportId,
            NodeId = report.NodeId,
            ReportCode = report.ReportCode,
            Title = report.Title,
            FunctionalDescription = report.FunctionalDescription,
            CalculationFormula = report.CalculationFormula,
            Status = report.Status,
            VerifiedByUserId = report.VerifiedByUserId,
            VerifiedByUserName = report.VerifiedByUser?.FullName,
            VerifiedAt = report.VerifiedAt,
            IsLocked = report.LockedByUserId != null,
            LockedByUserId = report.LockedByUserId,
            LockedByUserName = report.LockedByUser?.FullName,
            LockedAt = report.LockedAt,
            LockSessionId = report.LockSessionId,
            UpdatedAt = report.UpdatedAt,
            Fields = report.ReportFields
                .OrderBy(rf => rf.DisplayOrder)
                .Select(rf => new ReportFieldItemDto
                {
                    FieldId = rf.FieldId,
                    DisplayName = rf.Field?.DisplayName ?? string.Empty,
                    TechnicalName = rf.Field?.TechnicalName,
                    DataType = rf.Field?.DataType ?? string.Empty,
                    DisplayOrder = rf.DisplayOrder,
                    CustomFormula = rf.CustomFormula,
                    CustomNote = rf.CustomNote
                }).ToList(),
            Parameters = report.Parameters
                .Select(p => new ReportParameterItemDto
                {
                    ParameterId = p.ParameterId,
                    ParameterName = p.ParameterName,
                    DataType = p.DataType,
                    IsRequired = p.IsRequired,
                    Description = p.Description
                }).ToList(),
            Tags = report.ReportTags
                .Select(rt => new TagDto
                {
                    TagId = rt.TagId,
                    TagName = rt.Tag?.TagName ?? string.Empty,
                    ColorHex = rt.Tag?.ColorHex
                }).ToList(),
            Relations = report.SourceRelations
                .Select(sr => new ReportRelationItemDto
                {
                    RelationId = sr.RelationId,
                    TargetReportId = sr.TargetReportId,
                    TargetReportCode = sr.TargetReport?.ReportCode ?? string.Empty,
                    TargetTitle = sr.TargetReport?.Title ?? string.Empty,
                    RelationType = sr.RelationType,
                    DifferenceSummary = sr.DifferenceSummary
                }).ToList()
        };

        return Ok(dto);
    }

    [Authorize]
    [HttpPost("{id}/lock")]
    public async Task<IActionResult> AcquireLock(int id)
    {
        int userId = GetCurrentUserId();
        var (success, message, sessionId) = await _lockService.AcquireLockAsync(id, userId);

        if (!success)
            return Conflict(new { message });

        var user = await _context.Users.FindAsync(userId);
        await _hubContext.Clients.All.SendAsync("ReportLockChanged", new
        {
            reportId = id,
            isLocked = true,
            lockedByUserName = user?.FullName,
            sessionId
        });

        return Ok(new { success = true, sessionId, message });
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

        await _hubContext.Clients.All.SendAsync("ReportLockChanged", new
        {
            reportId = id,
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
    public async Task<IActionResult> VerifyReport(int id)
    {
        int userId = GetCurrentUserId();
        var report = await _context.Reports.FindAsync(id);
        if (report == null)
            return NotFound();

        report.Status = ReportStatus.Verified;
        report.VerifiedByUserId = userId;
        report.VerifiedAt = DateTime.UtcNow;
        report.UpdatedAt = DateTime.UtcNow;

        // آزادسازی قفل با تایید نهایی
        report.LockedByUserId = null;
        report.LockedAt = null;
        report.LockHeartbeatAt = null;
        report.LockSessionId = null;

        await _context.SaveChangesAsync();

        await _hubContext.Clients.All.SendAsync("ReportVerified", new
        {
            reportId = id,
            status = ReportStatus.Verified
        });

        return Ok(new { success = true, message = "گزارش با موفقیت تایید شد." });
    }

    [Authorize(Roles = "Manager,SystemAdmin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateReport(int id, [FromBody] UpdateReportDto dto)
    {
        int userId = GetCurrentUserId();
        var report = await _context.Reports
            .Include(r => r.ReportFields)
            .Include(r => r.Parameters)
            .Include(r => r.ReportTags)
            .FirstOrDefaultAsync(r => r.ReportId == id);

        if (report == null)
            return NotFound();

        // به‌روزرسانی مشخصات پایه
        report.Title = dto.Title;
        report.FunctionalDescription = dto.FunctionalDescription;
        report.CalculationFormula = dto.CalculationFormula;
        report.Status = ReportStatus.InProgress;
        report.UpdatedAt = DateTime.UtcNow;

        // به‌روزرسانی فیلدها
        _context.ReportFields.RemoveRange(report.ReportFields);
        int order = 1;
        foreach (var f in dto.Fields)
        {
            report.ReportFields.Add(new ReportField
            {
                FieldId = f.FieldId,
                DisplayOrder = f.DisplayOrder > 0 ? f.DisplayOrder : order++,
                CustomFormula = f.CustomFormula,
                CustomNote = f.CustomNote
            });
        }

        // به‌روزرسانی پارامترها
        _context.ReportParameters.RemoveRange(report.Parameters);
        foreach (var p in dto.Parameters)
        {
            report.Parameters.Add(new ReportParameter
            {
                ParameterName = p.ParameterName,
                DataType = p.DataType,
                IsRequired = p.IsRequired,
                Description = p.Description
            });
        }

        // به‌روزرسانی تگ‌ها
        _context.ReportTags.RemoveRange(report.ReportTags);
        foreach (var tagId in dto.TagIds)
        {
            report.ReportTags.Add(new ReportTag
            {
                TagId = tagId
            });
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "تغییرات گزارش با موفقیت ثبت شد." });
    }

    [Authorize(Roles = "Manager,SystemAdmin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteReport(int id)
    {
        var report = await _context.Reports
            .Include(r => r.Node)
            .FirstOrDefaultAsync(r => r.ReportId == id);

        if (report == null)
            return NotFound();

        if (report.Node != null)
        {
            _context.ReportTreeNodes.Remove(report.Node);
        }

        _context.Reports.Remove(report);
        await _context.SaveChangesAsync();

        await _hubContext.Clients.All.SendAsync("ReportDeleted", id);

        return Ok(new { success = true, message = "گزارش با موفقیت حذف شد." });
    }

    private int GetCurrentUserId()
    {
        var idStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(idStr, out int id) ? id : 1;
    }
}
