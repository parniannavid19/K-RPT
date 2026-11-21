using System.Security.Claims;
using KRpt.Core.DTOs;
using KRpt.Core.Entities;
using KRpt.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KRpt.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "SystemAdmin")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _context;

    public UsersController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<UserDto>>> GetUsers()
    {
        var users = await _context.Users
            .Include(u => u.Role)
            .OrderBy(u => u.UserId)
            .Select(u => new UserDto
            {
                UserId = u.UserId,
                Username = u.Username,
                FullName = u.FullName,
                RoleId = u.RoleId,
                RoleName = u.Role != null ? u.Role.TitleFa : "کارشناس",
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt
            })
            .ToListAsync();

        return Ok(users);
    }

    [HttpPost]
    public async Task<ActionResult<UserDto>> CreateUser([FromBody] CreateUserDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password) || string.IsNullOrWhiteSpace(dto.FullName))
            return BadRequest(new { message = "تمامی فیلدها الزامی هستند." });

        var exists = await _context.Users.AnyAsync(u => u.Username == dto.Username.Trim());
        if (exists)
            return Conflict(new { message = "نام کاربری تکراری است." });

        var hash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

        var user = new User
        {
            Username = dto.Username.Trim(),
            FullName = dto.FullName.Trim(),
            PasswordHash = hash,
            RoleId = dto.RoleId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var role = await _context.Roles.FindAsync(user.RoleId);

        return Ok(new UserDto
        {
            UserId = user.UserId,
            Username = user.Username,
            FullName = user.FullName,
            RoleId = user.RoleId,
            RoleName = role?.TitleFa ?? "کارشناس",
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserDto dto)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { message = "کاربر یافت نشد." });

        if (!string.IsNullOrWhiteSpace(dto.FullName))
            user.FullName = dto.FullName.Trim();

        user.RoleId = dto.RoleId;
        user.IsActive = dto.IsActive;

        if (!string.IsNullOrWhiteSpace(dto.NewPassword))
        {
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "اطلاعات کاربر با موفقیت به‌روزرسانی شد." });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var currentUserIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(currentUserIdStr, out int currentUserId) && currentUserId == id)
        {
            return BadRequest(new { message = "امکان حذف حساب کاربری جاری خودتان وجود ندارد." });
        }

        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { message = "کاربر یافت نشد." });

        if (user.Username.Equals("admin", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "امکان حذف مدیر ارشد پیش‌فرض سامانه وجود ندارد." });
        }

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "کاربر با موفقیت حذف شد." });
    }
}
