using KRpt.Api.Hubs;
using KRpt.Core.DTOs;
using KRpt.Core.Entities;
using KRpt.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace KRpt.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FieldBankController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IHubContext<ReportLockHub> _hubContext;

    public FieldBankController(AppDbContext context, IHubContext<ReportLockHub> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
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
                StandardDescription = f.StandardDescription
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
            StandardDescription = dto.StandardDescription?.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _context.FieldBank.Add(field);
        await _context.SaveChangesAsync();

        dto.FieldId = field.FieldId;

        // اعلان تغییرات به تمامی کلاینت‌های متصل
        await _hubContext.Clients.All.SendAsync("FieldBankChanged", new
        {
            action = "create",
            fieldId = field.FieldId,
            displayName = field.DisplayName,
            technicalName = field.TechnicalName
        });

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

        string oldDisplayName = field.DisplayName.Trim();
        string newDisplayName = dto.DisplayName.Trim();
        string? oldTechName = field.TechnicalName?.Trim();
        string? newTechName = dto.TechnicalName?.Trim();

        field.DisplayName = newDisplayName;
        field.TechnicalName = newTechName;
        field.StandardDescription = dto.StandardDescription?.Trim();

        // در صورت تغییر عنوان نمایشی فیلد، ارجاعات فرمولی فیلد در تمام گزارش‌ها و فیلدهای اختصاصی نیز هوشمندانه به‌روزرسانی می‌شوند
        if (!string.Equals(oldDisplayName, newDisplayName, StringComparison.OrdinalIgnoreCase))
        {
            string oldRefUnderscore = "@" + oldDisplayName.Replace(" ", "_");
            string newRefUnderscore = "@" + newDisplayName.Replace(" ", "_");
            string oldRefDirect = "@" + oldDisplayName;
            string newRefDirect = "@" + newDisplayName;

            // ۱. فرمول‌های محاسباتی کلی گزارش‌ها
            var reportsWithFormula = await _context.Reports
                .Where(r => r.CalculationFormula != null &&
                           (r.CalculationFormula.Contains(oldRefUnderscore) ||
                            r.CalculationFormula.Contains(oldRefDirect) ||
                            r.CalculationFormula.Contains(oldDisplayName)))
                .ToListAsync();

            foreach (var rep in reportsWithFormula)
            {
                if (rep.CalculationFormula != null)
                {
                    rep.CalculationFormula = rep.CalculationFormula
                        .Replace(oldRefUnderscore, newRefUnderscore)
                        .Replace(oldRefDirect, newRefDirect)
                        .Replace("@" + oldDisplayName, "@" + newDisplayName);
                    rep.UpdatedAt = DateTime.UtcNow;
                }
            }

            // ۲. فرمول‌های محاسباتی اختصاصی فیلدهای گزارش‌ها
            var reportFieldsWithFormula = await _context.ReportFields
                .Where(rf => rf.CustomFormula != null &&
                             (rf.CustomFormula.Contains(oldRefUnderscore) ||
                              rf.CustomFormula.Contains(oldRefDirect) ||
                              rf.CustomFormula.Contains(oldDisplayName)))
                .ToListAsync();

            foreach (var rf in reportFieldsWithFormula)
            {
                if (rf.CustomFormula != null)
                {
                    rf.CustomFormula = rf.CustomFormula
                        .Replace(oldRefUnderscore, newRefUnderscore)
                        .Replace(oldRefDirect, newRefDirect)
                        .Replace("@" + oldDisplayName, "@" + newDisplayName);
                }
            }
        }

        // شناسایی کلیه گزارش‌هایی که این فیلد در آن‌ها استفاده شده است جهت تازه کردن تاریخچه
        var affectedReportIds = await _context.ReportFields
            .Where(rf => rf.FieldId == id)
            .Select(rf => rf.ReportId)
            .Distinct()
            .ToListAsync();

        if (affectedReportIds.Count > 0)
        {
            var reportsToTouch = await _context.Reports
                .Where(r => affectedReportIds.Contains(r.ReportId))
                .ToListAsync();

            foreach (var rep in reportsToTouch)
            {
                rep.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync();

        // اعلان زنده تغییرات فیلد به کلیه کلاینت‌های متصل از طریق SignalR
        await _hubContext.Clients.All.SendAsync("FieldBankChanged", new
        {
            action = "update",
            fieldId = id,
            displayName = field.DisplayName,
            technicalName = field.TechnicalName,
            standardDescription = field.StandardDescription,
            affectedReportIds = affectedReportIds
        });

        return Ok(new
        {
            success = true,
            message = "فیلد با موفقیت ویرایش شد و در تمام بخش‌ها و گزارش‌های وابسته اعمال گردید.",
            affectedReportsCount = affectedReportIds.Count
        });
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

        var affectedReportIds = field.ReportFields.Select(rf => rf.ReportId).Distinct().ToList();

        if (field.ReportFields.Any() && force)
        {
            _context.ReportFields.RemoveRange(field.ReportFields);
        }

        _context.FieldBank.Remove(field);
        await _context.SaveChangesAsync();

        // اعلان حذف فیلد به تمامی کلاینت‌های متصل
        await _hubContext.Clients.All.SendAsync("FieldBankChanged", new
        {
            action = "delete",
            fieldId = id,
            affectedReportIds = affectedReportIds
        });

        return Ok(new { success = true, message = "فیلد از بانک مرکزی حذف شد." });
    }
}
