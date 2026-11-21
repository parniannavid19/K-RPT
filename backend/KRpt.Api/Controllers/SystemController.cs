using KRpt.Core.Entities;
using KRpt.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KRpt.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "SystemAdmin")]
public class SystemController : ControllerBase
{
    private readonly AppDbContext _context;

    public SystemController(AppDbContext context)
    {
        _context = context;
    }

    [HttpPost("reset")]
    public async Task<IActionResult> ResetSystem()
    {
        try
        {
            // ۱. پاکسازی کامل تمام داده‌های ماک و آزمایشی
            _context.AuditLogs.RemoveRange(_context.AuditLogs);
            _context.ReportRelations.RemoveRange(_context.ReportRelations);
            _context.ReportTags.RemoveRange(_context.ReportTags);
            _context.ReportFields.RemoveRange(_context.ReportFields);
            _context.ReportParameters.RemoveRange(_context.ReportParameters);
            _context.Reports.RemoveRange(_context.Reports);
            _context.ReportTreeNodes.RemoveRange(_context.ReportTreeNodes);
            _context.FieldBank.RemoveRange(_context.FieldBank);
            _context.Tags.RemoveRange(_context.Tags);

            // پاکسازی سایر کاربران و نگه داشتن تنها کاربر مدیر ارشد
            var nonAdminUsers = await _context.Users.Where(u => u.Username != "admin").ToListAsync();
            _context.Users.RemoveRange(nonAdminUsers);

            await _context.SaveChangesAsync();

            // ۲. اطمینان از وجود نقش‌های سه‌گانه
            if (!await _context.Roles.AnyAsync(r => r.RoleId == 1))
                _context.Roles.Add(new Role { RoleId = 1, RoleName = "Analyst", TitleFa = "کارشناس", Description = "مشاهده، جستجو، قفل‌گذاری و تایید نهایی گزارش‌ها" });

            if (!await _context.Roles.AnyAsync(r => r.RoleId == 2))
                _context.Roles.Add(new Role { RoleId = 2, RoleName = "Manager", TitleFa = "مدیر", Description = "مدیریت و ویرایش فرمول‌ها، فیلدها، پارامترها و تگ‌ها" });

            if (!await _context.Roles.AnyAsync(r => r.RoleId == 3))
                _context.Roles.Add(new Role { RoleId = 3, RoleName = "SystemAdmin", TitleFa = "مدیر سیستم", Description = "مدیریت کامل سیستم، درخت گزارش‌ها و کاربران" });

            // اطمینان از وجود کاربر ادمین با رمز admin123
            var adminUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == "admin");
            if (adminUser == null)
            {
                _context.Users.Add(new User
                {
                    Username = "admin",
                    FullName = "مدیر ارشد سامانه",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                    RoleId = 3,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                });
            }
            else
            {
                adminUser.PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123");
                adminUser.IsActive = true;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "تمامی داده‌های آزمایشی و ماک (گزارش‌ها، درختواره، فیلدها و تگ‌ها) با موفقیت پاکسازی شدند و سامانه به صورت کاملاً خام آماده ورود اطلاعات واقعی سازمان است."
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "خطا در پاکسازی سیستم: " + ex.Message });
        }
    }
}
