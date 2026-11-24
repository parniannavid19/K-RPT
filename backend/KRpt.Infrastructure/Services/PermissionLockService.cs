using KRpt.Core.Entities;
using KRpt.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace KRpt.Infrastructure.Services;

public interface IPermissionLockService
{
    Task<(bool Success, string? Message, Guid? SessionId)> AcquireLockAsync(int permissionId, int userId);
    Task<bool> ReleaseLockAsync(int permissionId, int userId, Guid? sessionId = null, bool force = false);
    Task<bool> HeartbeatAsync(int permissionId, int userId, Guid sessionId);
    Task CleanupExpiredLocksAsync(int timeoutMinutes = 30);
}

public class PermissionLockService : IPermissionLockService
{
    private readonly AppDbContext _context;

    public PermissionLockService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<(bool Success, string? Message, Guid? SessionId)> AcquireLockAsync(int permissionId, int userId)
    {
        var permission = await _context.Permissions
            .Include(p => p.LockedByUser)
            .FirstOrDefaultAsync(p => p.PermissionId == permissionId);

        if (permission == null)
            return (false, "دسترسی مورد نظر یافت نشد.", null);

        var lastActiveTime = permission.LockHeartbeatAt ?? permission.LockedAt;
        var isExpired = permission.LockedByUserId.HasValue &&
                        (!lastActiveTime.HasValue || lastActiveTime.Value.AddMinutes(30) < DateTime.UtcNow);

        if (permission.LockedByUserId.HasValue && !isExpired && permission.LockedByUserId != userId)
        {
            var lockedByName = permission.LockedByUser?.FullName ?? "کاربر دیگر";
            return (false, $"این دسترسی هم‌اکنون توسط «{lockedByName}» در حال ویرایش است.", null);
        }

        var sessionId = Guid.NewGuid();
        permission.LockedByUserId = userId;
        permission.LockedAt = DateTime.UtcNow;
        permission.LockHeartbeatAt = DateTime.UtcNow;
        permission.LockSessionId = sessionId;

        await _context.SaveChangesAsync();
        return (true, "قفل با موفقیت تخصیص یافت.", sessionId);
    }

    public async Task<bool> ReleaseLockAsync(int permissionId, int userId, Guid? sessionId = null, bool force = false)
    {
        var permission = await _context.Permissions.FirstOrDefaultAsync(p => p.PermissionId == permissionId);
        if (permission == null || !permission.LockedByUserId.HasValue)
            return true;

        if (!force && permission.LockedByUserId != userId)
            return false;

        if (!force && sessionId.HasValue && permission.LockSessionId.HasValue && permission.LockSessionId != sessionId)
            return false;

        permission.LockedByUserId = null;
        permission.LockedAt = null;
        permission.LockHeartbeatAt = null;
        permission.LockSessionId = null;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> HeartbeatAsync(int permissionId, int userId, Guid sessionId)
    {
        var permission = await _context.Permissions.FirstOrDefaultAsync(p => p.PermissionId == permissionId);
        if (permission == null || permission.LockedByUserId != userId || permission.LockSessionId != sessionId)
            return false;

        permission.LockHeartbeatAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task CleanupExpiredLocksAsync(int timeoutMinutes = 30)
    {
        var cutoff = DateTime.UtcNow.AddMinutes(-timeoutMinutes);
        var expired = await _context.Permissions
            .Where(p => p.LockedByUserId != null && p.LockHeartbeatAt != null && p.LockHeartbeatAt < cutoff)
            .ToListAsync();

        foreach (var p in expired)
        {
            p.LockedByUserId = null;
            p.LockedAt = null;
            p.LockHeartbeatAt = null;
            p.LockSessionId = null;
        }

        if (expired.Count > 0)
        {
            await _context.SaveChangesAsync();
        }
    }
}
