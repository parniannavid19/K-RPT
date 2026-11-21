using KRpt.Core.DTOs;
using KRpt.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KRpt.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SearchController : ControllerBase
{
    private readonly AppDbContext _context;

    public SearchController(AppDbContext context)
    {
        _context = context;
    }

    [HttpPost]
    public async Task<ActionResult<List<ReportSearchResultDto>>> SearchReports([FromBody] ReportSearchRequestDto req)
    {
        var query = _context.Reports
            .Include(r => r.Node)
            .Include(r => r.ReportFields)
            .Include(r => r.ReportTags)
                .ThenInclude(rt => rt.Tag)
            .AsQueryable();

        // فیلتر متنی
        if (!string.IsNullOrWhiteSpace(req.Query))
        {
            var q = req.Query.Trim();
            query = query.Where(r => r.Title.Contains(q) || 
                                     r.ReportCode.Contains(q) || 
                                     (r.FunctionalDescription != null && r.FunctionalDescription.Contains(q)));
        }

        // فیلتر وضعیت
        if (req.Status.HasValue)
        {
            query = query.Where(r => r.Status == req.Status.Value);
        }

        // فیلتر شاخه درختی
        if (req.NodeId.HasValue)
        {
            query = query.Where(r => r.NodeId == req.NodeId.Value || 
                                     (r.Node != null && r.Node.ParentNodeId == req.NodeId.Value));
        }

        // فیلتر تگ‌ها
        if (req.TagIds != null && req.TagIds.Count > 0)
        {
            query = query.Where(r => r.ReportTags.Any(rt => req.TagIds.Contains(rt.TagId)));
        }

        // فیلتر فیلدها با منطق AND یا OR
        if (req.FieldIds != null && req.FieldIds.Count > 0)
        {
            if (req.MatchAllFields)
            {
                // حالت AND: گزارش باید تمام فیلدهای انتخاب شده را داشته باشد
                foreach (var fid in req.FieldIds)
                {
                    query = query.Where(r => r.ReportFields.Any(rf => rf.FieldId == fid));
                }
            }
            else
            {
                // حالت OR: گزارش حداقل یکی از فیلدهای انتخاب شده را داشته باشد
                query = query.Where(r => r.ReportFields.Any(rf => req.FieldIds.Contains(rf.FieldId)));
            }
        }

        var results = await query
            .OrderBy(r => r.ReportCode)
            .Select(r => new ReportSearchResultDto
            {
                ReportId = r.ReportId,
                ReportCode = r.ReportCode,
                Title = r.Title,
                Status = r.Status,
                ModuleTitle = r.Node != null && r.Node.ParentNode != null ? r.Node.ParentNode.Title : (r.Node != null ? r.Node.Title : string.Empty),
                TagNames = r.ReportTags.Select(rt => rt.Tag!.TagName).ToList(),
                FieldCount = r.ReportFields.Count,
                MatchedFieldCount = req.FieldIds != null ? r.ReportFields.Count(rf => req.FieldIds.Contains(rf.FieldId)) : r.ReportFields.Count
            })
            .ToListAsync();

        return Ok(results);
    }
}
