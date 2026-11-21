using KRpt.Core.Entities;
using KRpt.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace KRpt.Infrastructure.Services;

public interface IReportLockService
{
    Task<(bool Success, string? Message, Guid? SessionId)> AcquireLockAsync(int reportId, int userId);
    Task<bool> ReleaseLockAsync(int reportId, int userId, Guid? sessionId = null, bool force = false);
    Task<bool> HeartbeatAsync(int reportId, int userId, Guid sessionId);
    Task CleanupExpiredLocksAsync(int timeoutMinutes = 30);
}

public class ReportLockService : IReportLockService
{
    private readonly AppDbContext _context;

    public ReportLockService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<(bool Success, string? Message, Guid? SessionId)> AcquireLockAsync(int reportId, int userId)
    {
        var report = await _context.Reports
            .Include(r => r.LockedByUser)
            .FirstOrDefaultAsync(r => r.ReportId == reportId);

        if (report == null)
            return (false, "گزارش مورد نظر یافت نشد.", null);

        // بررسی اینکه آیا قفل منقضی شده است (مثلا ۳۰ دقیقه عدم دریافت Heartbeat)
        var isExpired = report.LockedByUserId.HasValue && 
                        report.LockHeartbeatAt.HasValue && 
                        report.LockHeartbeatAt.Value.AddMinutes(30) < DateTime.UtcNow;

        if (report.LockedByUserId.HasValue && !isExpired && report.LockedByUserId != userId)
        {
            var lockedByName = report.LockedByUser?.FullName ?? "کاربر دیگر";
            return (false, $"این گزارش هم‌اکنون توسط «{lockedByName}» در حال بررسی/ویرایش است.", null);
        }

        var sessionId = Guid.NewGuid();
        report.LockedByUserId = userId;
        report.LockedAt = DateTime.UtcNow;
        report.LockHeartbeatAt = DateTime.UtcNow;
        report.LockSessionId = sessionId;

        await _context.SaveChangesAsync();
        return (true, "قفل با موفقیت تخصیص یافت.", sessionId);
    }

    public async Task<bool> ReleaseLockAsync(int reportId, int userId, Guid? sessionId = null, bool force = false)
    {
        var report = await _context.Reports.FirstOrDefaultAsync(r => r.ReportId == reportId);
        if (report == null || !report.LockedByUserId.HasValue)
            return true;

        if (!force && report.LockedByUserId != userId)
            return false;

        if (!force && sessionId.HasValue && report.LockSessionId.HasValue && report.LockSessionId != sessionId)
            return false;

        report.LockedByUserId = null;
        report.LockedAt = null;
        report.LockHeartbeatAt = null;
        report.LockSessionId = null;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> HeartbeatAsync(int reportId, int userId, Guid sessionId)
    {
        var report = await _context.Reports.FirstOrDefaultAsync(r => r.ReportId == reportId);
        if (report == null || report.LockedByUserId != userId || report.LockSessionId != sessionId)
            return false;

        report.LockHeartbeatAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task CleanupExpiredLocksAsync(int timeoutMinutes = 30)
    {
        var cutoff = DateTime.UtcNow.AddMinutes(-timeoutMinutes);
        var expiredReports = await _context.Reports
            .Where(r => r.LockedByUserId != null && r.LockHeartbeatAt != null && r.LockHeartbeatAt < cutoff)
            .ToListAsync();

        foreach (var r in expiredReports)
        {
            r.LockedByUserId = null;
            r.LockedAt = null;
            r.LockHeartbeatAt = null;
            r.LockSessionId = null;
        }

        if (expiredReports.Count > 0)
            await _context.SaveChangesAsync();
    }
}
