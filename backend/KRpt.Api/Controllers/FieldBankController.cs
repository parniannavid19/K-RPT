using KRpt.Core.DTOs;
using KRpt.Core.Entities;
using KRpt.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KRpt.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FieldBankController : ControllerBase
{
    private readonly AppDbContext _context;

    public FieldBankController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<FieldBankDto>>> GetFields([FromQuery] string? search)
    {
        var query = _context.FieldBank.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(f => f.DisplayName.Contains(search) || 
                                     (f.TechnicalName != null && f.TechnicalName.Contains(search)));
        }

        var fields = await query
            .OrderBy(f => f.DisplayName)
            .Select(f => new FieldBankDto
            {
                FieldId = f.FieldId,
                DisplayName = f.DisplayName,
                TechnicalName = f.TechnicalName,
                DataType = f.DataType,
                StandardDescription = f.StandardDescription,
                DefaultFormula = f.DefaultFormula
            })
            .ToListAsync();

        return Ok(fields);
    }

    [HttpPost]
    public async Task<ActionResult<FieldBankDto>> CreateField([FromBody] FieldBankDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.DisplayName))
            return BadRequest(new { message = "عنوان فارسی فیلد الزامی است." });

        var field = new FieldBank
        {
            DisplayName = dto.DisplayName.Trim(),
            TechnicalName = dto.TechnicalName?.Trim(),
            DataType = string.IsNullOrWhiteSpace(dto.DataType) ? "NVARCHAR(50)" : dto.DataType.Trim(),
            StandardDescription = dto.StandardDescription?.Trim(),
            DefaultFormula = dto.DefaultFormula?.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _context.FieldBank.Add(field);
        await _context.SaveChangesAsync();

        dto.FieldId = field.FieldId;
        return CreatedAtAction(nameof(GetFields), new { id = field.FieldId }, dto);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateField(int id, [FromBody] FieldBankDto dto)
    {
        var field = await _context.FieldBank.FindAsync(id);
        if (field == null)
            return NotFound(new { message = "فیلد مورد نظر یافت نشد." });

        if (string.IsNullOrWhiteSpace(dto.DisplayName))
            return BadRequest(new { message = "عنوان فارسی فیلد الزامی است." });

        field.DisplayName = dto.DisplayName.Trim();
        field.TechnicalName = dto.TechnicalName?.Trim();
        field.DataType = string.IsNullOrWhiteSpace(dto.DataType) ? field.DataType : dto.DataType.Trim();
        field.StandardDescription = dto.StandardDescription?.Trim();
        field.DefaultFormula = dto.DefaultFormula?.Trim();

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "فیلد با موفقیت ویرایش شد." });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteField(int id, [FromQuery] bool force = false)
    {
        var field = await _context.FieldBank
            .Include(f => f.ReportFields)
            .FirstOrDefaultAsync(f => f.FieldId == id);

        if (field == null)
            return NotFound(new { message = "فیلد مورد نظر یافت نشد." });

        if (field.ReportFields.Any() && !force)
        {
            return BadRequest(new
            {
                message = $"این فیلد در {field.ReportFields.Count} گزارش استفاده شده است. برای حذف، ابتدا باید از گزارش‌ها حذف شود یا تایید حذف اجباری داده شود."
            });
        }

        if (field.ReportFields.Any() && force)
        {
            _context.ReportFields.RemoveRange(field.ReportFields);
        }

        _context.FieldBank.Remove(field);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "فیلد از بانک مرکزی حذف شد." });
    }
}
