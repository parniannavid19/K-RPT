using KRpt.Core.DTOs;
using KRpt.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KRpt.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DiffController : ControllerBase
{
    private readonly AppDbContext _context;

    public DiffController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<CompareReportsResponseDto>> CompareReports([FromQuery] int reportAId, [FromQuery] int reportBId)
    {
        var reportA = await _context.Reports
            .Include(r => r.ReportFields).ThenInclude(rf => rf.Field)
            .Include(r => r.Parameters)
            .Include(r => r.ReportTags).ThenInclude(rt => rt.Tag)
            .FirstOrDefaultAsync(r => r.ReportId == reportAId);

        var reportB = await _context.Reports
            .Include(r => r.ReportFields).ThenInclude(rf => rf.Field)
            .Include(r => r.Parameters)
            .Include(r => r.ReportTags).ThenInclude(rt => rt.Tag)
            .FirstOrDefaultAsync(r => r.ReportId == reportBId);

        if (reportA == null || reportB == null)
            return NotFound(new { message = "یک یا هر دو گزارش جهت مقایسه یافت نشدند." });

        var response = new CompareReportsResponseDto
        {
            ReportA = MapToDetail(reportA),
            ReportB = MapToDetail(reportB)
        };

        // ۱. مقایسه فیلدها
        var allFieldIds = reportA.ReportFields.Select(rf => rf.FieldId)
            .Union(reportB.ReportFields.Select(rf => rf.FieldId))
            .Distinct()
            .ToList();

        var fieldsDict = await _context.FieldBank
            .Where(f => allFieldIds.Contains(f.FieldId))
            .ToDictionaryAsync(f => f.FieldId);

        foreach (var fid in allFieldIds)
        {
            var rfA = reportA.ReportFields.FirstOrDefault(f => f.FieldId == fid);
            var rfB = reportB.ReportFields.FirstOrDefault(f => f.FieldId == fid);
            fieldsDict.TryGetValue(fid, out var fieldBank);

            var diff = new FieldDiffDto
            {
                FieldId = fid,
                DisplayName = fieldBank?.DisplayName ?? string.Empty,
                TechnicalName = fieldBank?.TechnicalName ?? string.Empty,
                ExistsInReportA = rfA != null,
                ExistsInReportB = rfB != null,
                FormulaA = rfA?.CustomFormula,
                FormulaB = rfB?.CustomFormula,
                CustomNoteA = rfA?.CustomNote,
                CustomNoteB = rfB?.CustomNote,
                HasFormulaDifference = (rfA != null && rfB != null) && (rfA.CustomFormula != rfB.CustomFormula)
            };

            response.FieldDiffs.Add(diff);
        }

        // ۲. مقایسه پارامترها
        var allParamNames = reportA.Parameters.Select(p => p.ParameterName)
            .Union(reportB.Parameters.Select(p => p.ParameterName))
            .Distinct()
            .ToList();

        foreach (var pName in allParamNames)
        {
            var pA = reportA.Parameters.FirstOrDefault(p => p.ParameterName == pName);
            var pB = reportB.Parameters.FirstOrDefault(p => p.ParameterName == pName);

            response.ParameterDiffs.Add(new ParameterDiffDto
            {
                ParameterName = pName,
                ExistsInReportA = pA != null,
                ExistsInReportB = pB != null,
                IsRequiredA = pA?.IsRequired,
                IsRequiredB = pB?.IsRequired
            });
        }

        return Ok(response);
    }

    private static ReportDetailDto MapToDetail(Core.Entities.Report r)
    {
        return new ReportDetailDto
        {
            ReportId = r.ReportId,
            NodeId = r.NodeId,
            ReportCode = r.ReportCode,
            Title = r.Title,
            FunctionalDescription = r.FunctionalDescription,
            CalculationFormula = r.CalculationFormula,
            Status = r.Status,
            Fields = r.ReportFields.Select(rf => new ReportFieldItemDto
            {
                FieldId = rf.FieldId,
                DisplayName = rf.Field?.DisplayName ?? string.Empty,
                TechnicalName = rf.Field?.TechnicalName,
                DataType = rf.Field?.DataType ?? string.Empty,
                DisplayOrder = rf.DisplayOrder,
                CustomFormula = rf.CustomFormula,
                CustomNote = rf.CustomNote
            }).ToList(),
            Parameters = r.Parameters.Select(p => new ReportParameterItemDto
            {
                ParameterId = p.ParameterId,
                ParameterName = p.ParameterName,
                DataType = p.DataType,
                IsRequired = p.IsRequired,
                Description = p.Description
            }).ToList(),
            Tags = r.ReportTags.Select(rt => new TagDto
            {
                TagId = rt.TagId,
                TagName = rt.Tag?.TagName ?? string.Empty,
                ColorHex = rt.Tag?.ColorHex
            }).ToList()
        };
    }
}
