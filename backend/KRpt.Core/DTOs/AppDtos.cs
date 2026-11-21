using KRpt.Core.Enums;

namespace KRpt.Core.DTOs;

public class LoginRequestDto
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class LoginResponseDto
{
    public string Token { get; set; } = string.Empty;
    public int UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public byte RoleId { get; set; }
    public string RoleName { get; set; } = string.Empty;
}

public class UserDto
{
    public int UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public byte RoleId { get; set; }
    public string RoleName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateUserDto
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public byte RoleId { get; set; }
}

public class UpdateUserDto
{
    public string FullName { get; set; } = string.Empty;
    public byte RoleId { get; set; }
    public bool IsActive { get; set; } = true;
    public string? NewPassword { get; set; }
}

public class TreeNodeDto
{
    public int NodeId { get; set; }
    public int? ParentNodeId { get; set; }
    public string Title { get; set; } = string.Empty;
    public TreeNodeType NodeType { get; set; }
    public int SortOrder { get; set; }
    public int? ReportId { get; set; }
    public string? ReportCode { get; set; }
    public ReportStatus? Status { get; set; }
    public bool IsLocked { get; set; }
    public string? LockedByUserName { get; set; }
    public List<TreeNodeDto> Children { get; set; } = new();
}

public class CreateTreeNodeDto
{
    public int? ParentNodeId { get; set; }
    public string Title { get; set; } = string.Empty;
    public TreeNodeType NodeType { get; set; }
    public string? ReportCode { get; set; }
    public string? FunctionalDescription { get; set; }
    public string? CalculationFormula { get; set; }
}

public class SwapNodesDto
{
    public int SourceNodeId { get; set; }
    public int TargetNodeId { get; set; }
    public bool SwapCodes { get; set; } = true;
    public bool SwapPositions { get; set; } = true;
}

public class FieldBankDto
{
    public int FieldId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string? TechnicalName { get; set; }
    public string DataType { get; set; } = string.Empty;
    public string? StandardDescription { get; set; }
    public string? DefaultFormula { get; set; }
}

public class ParameterBankDto
{
    public int ParameterBankId { get; set; }
    public string ParameterName { get; set; } = string.Empty;
    public string DataType { get; set; } = string.Empty;
    public bool DefaultIsRequired { get; set; }
    public string? Description { get; set; }
}

public class CreateTagDto
{
    public string TagName { get; set; } = string.Empty;
    public string? ColorHex { get; set; } = "#3B82F6";
}

public class ReportFieldItemDto
{
    public int FieldId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string? TechnicalName { get; set; }
    public string DataType { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public string? CustomFormula { get; set; }
    public string? CustomNote { get; set; }
}

public class ReportParameterItemDto
{
    public int ParameterId { get; set; }
    public string ParameterName { get; set; } = string.Empty;
    public string DataType { get; set; } = string.Empty;
    public bool IsRequired { get; set; }
    public string? Description { get; set; }
}

public class TagDto
{
    public int TagId { get; set; }
    public string TagName { get; set; } = string.Empty;
    public string? ColorHex { get; set; }
}

public class ReportRelationItemDto
{
    public int RelationId { get; set; }
    public int TargetReportId { get; set; }
    public string TargetReportCode { get; set; } = string.Empty;
    public string TargetTitle { get; set; } = string.Empty;
    public RelationType RelationType { get; set; }
    public string? DifferenceSummary { get; set; }
}

public class ReportDetailDto
{
    public int ReportId { get; set; }
    public int NodeId { get; set; }
    public string ReportCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? FunctionalDescription { get; set; }
    public string? CalculationFormula { get; set; }
    public ReportStatus Status { get; set; }
    public int? VerifiedByUserId { get; set; }
    public string? VerifiedByUserName { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public bool IsLocked { get; set; }
    public int? LockedByUserId { get; set; }
    public string? LockedByUserName { get; set; }
    public DateTime? LockedAt { get; set; }
    public Guid? LockSessionId { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    public List<ReportFieldItemDto> Fields { get; set; } = new();
    public List<ReportParameterItemDto> Parameters { get; set; } = new();
    public List<TagDto> Tags { get; set; } = new();
    public List<ReportRelationItemDto> Relations { get; set; } = new();
}

public class UpdateReportDto
{
    public string Title { get; set; } = string.Empty;
    public string? FunctionalDescription { get; set; }
    public string? CalculationFormula { get; set; }
    public List<ReportFieldItemDto> Fields { get; set; } = new();
    public List<ReportParameterItemDto> Parameters { get; set; } = new();
    public List<int> TagIds { get; set; } = new();
}

public class ReportSearchRequestDto
{
    public string? Query { get; set; }
    public List<int>? FieldIds { get; set; }
    public bool MatchAllFields { get; set; } = false; // true = AND, false = OR
    public List<int>? TagIds { get; set; }
    public int? NodeId { get; set; }
    public ReportStatus? Status { get; set; }
}

public class ReportSearchResultDto
{
    public int ReportId { get; set; }
    public string ReportCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public ReportStatus Status { get; set; }
    public string? ModuleTitle { get; set; }
    public List<string> TagNames { get; set; } = new();
    public int FieldCount { get; set; }
    public int MatchedFieldCount { get; set; }
}

public class FieldDiffDto
{
    public int FieldId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string TechnicalName { get; set; } = string.Empty;
    public bool ExistsInReportA { get; set; }
    public bool ExistsInReportB { get; set; }
    public string? FormulaA { get; set; }
    public string? FormulaB { get; set; }
    public string? CustomNoteA { get; set; }
    public string? CustomNoteB { get; set; }
    public bool HasFormulaDifference { get; set; }
}

public class ParameterDiffDto
{
    public string ParameterName { get; set; } = string.Empty;
    public bool ExistsInReportA { get; set; }
    public bool ExistsInReportB { get; set; }
    public bool? IsRequiredA { get; set; }
    public bool? IsRequiredB { get; set; }
}

public class CompareReportsResponseDto
{
    public ReportDetailDto ReportA { get; set; } = new();
    public ReportDetailDto ReportB { get; set; } = new();
    public List<FieldDiffDto> FieldDiffs { get; set; } = new();
    public List<ParameterDiffDto> ParameterDiffs { get; set; } = new();
}
