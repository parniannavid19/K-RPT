using KRpt.Core.DTOs;
using KRpt.Core.Entities;
using KRpt.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KRpt.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ParameterBankController : ControllerBase
{
    private readonly AppDbContext _context;

    public ParameterBankController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<ParameterBankDto>>> GetParameters([FromQuery] string? search)
    {
        var query = _context.ParameterBank.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(p => p.ParameterName.Contains(search) || 
                                     (p.Description != null && p.Description.Contains(search)));
        }

        var list = await query
            .OrderBy(p => p.ParameterName)
            .Select(p => new ParameterBankDto
            {
                ParameterBankId = p.ParameterBankId,
                ParameterName = p.ParameterName,
                DataType = p.DataType,
                DefaultIsRequired = p.DefaultIsRequired,
                Description = p.Description,
                UiControlType = string.IsNullOrWhiteSpace(p.UiControlType) ? "text" : p.UiControlType,
                ControlConfigJson = p.ControlConfigJson
            })
            .ToListAsync();

        return Ok(list);
    }

    [HttpPost]
    public async Task<ActionResult<ParameterBankDto>> CreateParameter([FromBody] ParameterBankDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.ParameterName))
            return BadRequest(new { message = "نام پارامتر الزامی است." });

        var exists = await _context.ParameterBank.AnyAsync(p => p.ParameterName == dto.ParameterName.Trim());
        if (exists)
            return Conflict(new { message = "پارامتری با این نام از قبل در بانک پارامترها وجود دارد." });

        var param = new ParameterBank
        {
            ParameterName = dto.ParameterName.Trim(),
            DataType = string.IsNullOrWhiteSpace(dto.DataType) ? "NVARCHAR(50)" : dto.DataType.Trim(),
            DefaultIsRequired = dto.DefaultIsRequired,
            Description = dto.Description?.Trim(),
            UiControlType = string.IsNullOrWhiteSpace(dto.UiControlType) ? "text" : dto.UiControlType.Trim(),
            ControlConfigJson = dto.ControlConfigJson?.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _context.ParameterBank.Add(param);
        await _context.SaveChangesAsync();

        dto.ParameterBankId = param.ParameterBankId;
        return Ok(dto);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateParameter(int id, [FromBody] ParameterBankDto dto)
    {
        var param = await _context.ParameterBank.FindAsync(id);
        if (param == null)
            return NotFound(new { message = "پارامتر یافت نشد." });

        if (string.IsNullOrWhiteSpace(dto.ParameterName))
            return BadRequest(new { message = "نام پارامتر الزامی است." });

        param.ParameterName = dto.ParameterName.Trim();
        param.DataType = string.IsNullOrWhiteSpace(dto.DataType) ? param.DataType : dto.DataType.Trim();
        param.DefaultIsRequired = dto.DefaultIsRequired;
        param.Description = dto.Description?.Trim();
        param.UiControlType = string.IsNullOrWhiteSpace(dto.UiControlType) ? "text" : dto.UiControlType.Trim();
        param.ControlConfigJson = dto.ControlConfigJson?.Trim();

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "پارامتر با موفقیت ویرایش شد." });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteParameter(int id)
    {
        var param = await _context.ParameterBank.FindAsync(id);
        if (param == null)
            return NotFound(new { message = "پارامتر یافت نشد." });

        _context.ParameterBank.Remove(param);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "پارامتر از بانک مرکزی حذف شد." });
    }
}
