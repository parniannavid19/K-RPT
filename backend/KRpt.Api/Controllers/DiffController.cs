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

    [HttpPost("multi")]
    public async Task<ActionResult<MultiReportCompareResponseDto>> CompareMultipleReports([FromBody] MultiReportCompareRequestDto request)
    {
        if (request?.ReportIds == null || request.ReportIds.Count < 2)
            return BadRequest(new { message = "حداقل انتخاب ۲ گزارش جهت مقایسه الزامی است." });

        var uniqueIds = request.ReportIds.Distinct().Take(10).ToList();

        var reports = await _context.Reports
            .Include(r => r.ReportFields).ThenInclude(rf => rf.Field)
            .Include(r => r.Parameters)
            .Include(r => r.ReportTags).ThenInclude(rt => rt.Tag)
            .Where(r => uniqueIds.Contains(r.ReportId))
            .ToListAsync();

        if (reports.Count < 2)
            return NotFound(new { message = "حداقل ۲ گزارش معتبر برای مقایسه یافت نشد." });

        // مرتب‌سازی مطابق ترتیب انتخاب کاربر
        var orderedReports = uniqueIds
            .Select(id => reports.FirstOrDefault(r => r.ReportId == id))
            .Where(r => r != null)
            .Cast<Core.Entities.Report>()
            .ToList();

        var response = new MultiReportCompareResponseDto
        {
            Reports = orderedReports.Select(MapToDetail).ToList()
        };

        // ۱. گردآوری کلیه فیلدها
        var allFieldIds = orderedReports
            .SelectMany(r => r.ReportFields.Select(rf => rf.FieldId))
            .Distinct()
            .ToList();

        var fieldsDict = await _context.FieldBank
            .Where(f => allFieldIds.Contains(f.FieldId))
            .ToDictionaryAsync(f => f.FieldId);

        foreach (var fid in allFieldIds)
        {
            fieldsDict.TryGetValue(fid, out var fieldBank);
            var presenceList = new List<MultiReportFieldPresenceDto>();
            var formulas = new HashSet<string>();

            foreach (var rep in orderedReports)
            {
                var rf = rep.ReportFields.FirstOrDefault(f => f.FieldId == fid);
                var presence = new MultiReportFieldPresenceDto
                {
                    ReportId = rep.ReportId,
                    ReportCode = rep.ReportCode,
                    ReportTitle = rep.Title,
                    Exists = rf != null,
                    DisplayOrder = rf?.DisplayOrder ?? 0,
                    CustomFormula = rf?.CustomFormula,
                    CustomNote = rf?.CustomNote
                };
                presenceList.Add(presence);

                if (rf != null && !string.IsNullOrWhiteSpace(rf.CustomFormula))
                {
                    formulas.Add(rf.CustomFormula.Trim());
                }
            }

            int countExists = presenceList.Count(p => p.Exists);
            bool isCommon = countExists == orderedReports.Count;
            bool hasFormulaDiff = formulas.Count > 1;

            response.FieldDiffs.Add(new MultiReportFieldDiffDto
            {
                FieldId = fid,
                DisplayName = fieldBank?.DisplayName ?? string.Empty,
                TechnicalName = fieldBank?.TechnicalName,
                IsCommonToAll = isCommon,
                HasFormulaDifference = hasFormulaDiff,
                Presence = presenceList
            });
        }

        // ۲. گردآوری کلیه پارامترها
        var allParamNames = orderedReports
            .SelectMany(r => r.Parameters.Select(p => p.ParameterName))
            .Distinct()
            .ToList();

        foreach (var pName in allParamNames)
        {
            var presenceList = new List<MultiReportParamPresenceDto>();
            foreach (var rep in orderedReports)
            {
                var p = rep.Parameters.FirstOrDefault(x => x.ParameterName == pName);
                presenceList.Add(new MultiReportParamPresenceDto
                {
                    ReportId = rep.ReportId,
                    ReportCode = rep.ReportCode,
                    Exists = p != null,
                    IsRequired = p?.IsRequired,
                    DataType = p?.DataType
                });
            }

            int countExists = presenceList.Count(p => p.Exists);
            response.ParameterDiffs.Add(new MultiReportParamDiffDto
            {
                ParameterName = pName,
                IsCommonToAll = countExists == orderedReports.Count,
                Presence = presenceList
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
