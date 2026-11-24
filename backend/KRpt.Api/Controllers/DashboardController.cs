using KRpt.Core.Enums;
using KRpt.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KRpt.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _context;

    public DashboardController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("stats")]
    public async Task<ActionResult<object>> GetStats()
    {
        // آمار گزارش‌ها
        var reportsTotal = await _context.Reports.CountAsync();
        var reportsVerified = await _context.Reports.CountAsync(r => r.Status == ReportStatus.Verified);
        var reportsUnderReview = await _context.Reports.CountAsync(r => r.Status == ReportStatus.InProgress);
        var reportsPending = await _context.Reports.CountAsync(r => r.Status == ReportStatus.Pending);
        var reportsLocked = await _context.Reports.CountAsync(r => r.LockedByUserId != null);
        var reportNodesCount = await _context.ReportTreeNodes.CountAsync();

        // آمار دسترسی‌ها
        var permissionsTotal = await _context.Permissions.CountAsync();
        var permissionsVerified = await _context.Permissions.CountAsync(p => p.Status == ReportStatus.Verified);
        var permissionsUnderReview = await _context.Permissions.CountAsync(p => p.Status == ReportStatus.InProgress);
        var permissionsPending = await _context.Permissions.CountAsync(p => p.Status == ReportStatus.Pending);
        var permissionsLocked = await _context.Permissions.CountAsync(p => p.LockedByUserId != null);
        var permissionNodesCount = await _context.PermissionTreeNodes.CountAsync();

        // خلاصه کل
        var totalEntities = reportsTotal + permissionsTotal;
        var totalVerified = reportsVerified + permissionsVerified;
        var totalUnderReview = reportsUnderReview + permissionsUnderReview;
        var totalPending = reportsPending + permissionsPending;
        var totalLocked = reportsLocked + permissionsLocked;
        var verificationRate = totalEntities > 0 
            ? Math.Round((double)totalVerified / totalEntities * 100, 1) 
            : 0;

        return Ok(new
        {
            reports = new
            {
                total = reportsTotal,
                verified = reportsVerified,
                underReview = reportsUnderReview,
                pending = reportsPending,
                locked = reportsLocked,
                totalNodes = reportNodesCount
            },
            permissions = new
            {
                total = permissionsTotal,
                verified = permissionsVerified,
                underReview = permissionsUnderReview,
                pending = permissionsPending,
                locked = permissionsLocked,
                totalNodes = permissionNodesCount
            },
            configs = new
            {
                total = 0,
                plannedModulesCount = 12,
                status = "planned",
                description = "ماژول پیکربندی پارامترها و کانفیگ‌ها در فازهای آتی فعال خواهد شد"
            },
            summary = new
            {
                totalEntities,
                totalVerified,
                totalUnderReview,
                totalPending,
                totalLocked,
                verificationRate
            }
        });
    }
}
