using KRpt.Core.DTOs;
using KRpt.Core.Entities;
using KRpt.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KRpt.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TagsController : ControllerBase
{
    private readonly AppDbContext _context;

    public TagsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<TagDto>>> GetTags()
    {
        var tags = await _context.Tags
            .OrderBy(t => t.TagName)
            .Select(t => new TagDto
            {
                TagId = t.TagId,
                TagName = t.TagName,
                ColorHex = t.ColorHex
            })
            .ToListAsync();

        return Ok(tags);
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<TagDto>> CreateTag([FromBody] CreateTagDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.TagName))
            return BadRequest(new { message = "نام برچسب الزامی است." });

        var exists = await _context.Tags.AnyAsync(t => t.TagName == dto.TagName.Trim());
        if (exists)
            return Conflict(new { message = "برچسبی با این نام از قبل موجود است." });

        var tag = new Tag
        {
            TagName = dto.TagName.Trim(),
            ColorHex = string.IsNullOrWhiteSpace(dto.ColorHex) ? "#3B82F6" : dto.ColorHex.Trim()
        };

        _context.Tags.Add(tag);
        await _context.SaveChangesAsync();

        return Ok(new TagDto
        {
            TagId = tag.TagId,
            TagName = tag.TagName,
            ColorHex = tag.ColorHex
        });
    }

    [Authorize(Roles = "Manager,SystemAdmin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTag(int id, [FromBody] CreateTagDto dto)
    {
        var tag = await _context.Tags.FindAsync(id);
        if (tag == null)
            return NotFound(new { message = "برچسب یافت نشد." });

        if (string.IsNullOrWhiteSpace(dto.TagName))
            return BadRequest(new { message = "نام برچسب الزامی است." });

        tag.TagName = dto.TagName.Trim();
        if (!string.IsNullOrWhiteSpace(dto.ColorHex))
            tag.ColorHex = dto.ColorHex.Trim();

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "برچسب با موفقیت ویرایش شد." });
    }

    [Authorize(Roles = "Manager,SystemAdmin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTag(int id)
    {
        var tag = await _context.Tags.FindAsync(id);
        if (tag == null)
            return NotFound(new { message = "برچسب یافت نشد." });

        _context.Tags.Remove(tag);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "برچسب با موفقیت حذف شد." });
    }
}
