using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using KRpt.Core.Enums;
using Microsoft.EntityFrameworkCore;

namespace KRpt.Core.Entities;

[Table("Roles")]
public class Role
{
    [Key]
    public byte RoleId { get; set; }
    
    [Required, MaxLength(50)]
    public string RoleName { get; set; } = string.Empty;
    
    [Required, MaxLength(100)]
    public string TitleFa { get; set; } = string.Empty;
    
    [MaxLength(250)]
    public string? Description { get; set; }

    public ICollection<User> Users { get; set; } = new List<User>();
}

[Table("Users")]
public class User
{
    [Key]
    public int UserId { get; set; }
    
    [Required, MaxLength(100)]
    public string Username { get; set; } = string.Empty;
    
    [Required, MaxLength(500)]
    public string PasswordHash { get; set; } = string.Empty;
    
    [Required, MaxLength(150)]
    public string FullName { get; set; } = string.Empty;
    
    public byte RoleId { get; set; }
    
    [ForeignKey(nameof(RoleId))]
    public Role? Role { get; set; }
    
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[Table("ReportTreeNodes")]
public class ReportTreeNode
{
    [Key]
    public int NodeId { get; set; }
    
    public int? ParentNodeId { get; set; }
    
    [ForeignKey(nameof(ParentNodeId))]
    public ReportTreeNode? ParentNode { get; set; }
    
    public ICollection<ReportTreeNode> Children { get; set; } = new List<ReportTreeNode>();
    
    [Required, MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    
    public TreeNodeType NodeType { get; set; }
    public int SortOrder { get; set; }
    public HierarchyId? HierarchyPath { get; set; }
    
    public Report? Report { get; set; }
}

[Table("Reports")]
public class Report
{
    [Key]
    public int ReportId { get; set; }
    
    public int NodeId { get; set; }
    
    [ForeignKey(nameof(NodeId))]
    public ReportTreeNode? Node { get; set; }
    
    [Required, MaxLength(50)]
    public string ReportCode { get; set; } = string.Empty;
    
    [Required, MaxLength(250)]
    public string Title { get; set; } = string.Empty;
    
    public string? FunctionalDescription { get; set; }
    public string? CalculationFormula { get; set; }
    
    public ReportStatus Status { get; set; } = ReportStatus.Pending;
    
    public int? VerifiedByUserId { get; set; }
    [ForeignKey(nameof(VerifiedByUserId))]
    public User? VerifiedByUser { get; set; }
    public DateTime? VerifiedAt { get; set; }
    
    public int? LockedByUserId { get; set; }
    [ForeignKey(nameof(LockedByUserId))]
    public User? LockedByUser { get; set; }
    public DateTime? LockedAt { get; set; }
    public DateTime? LockHeartbeatAt { get; set; }
    public Guid? LockSessionId { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    public ICollection<ReportField> ReportFields { get; set; } = new List<ReportField>();
    public ICollection<ReportParameter> Parameters { get; set; } = new List<ReportParameter>();
    public ICollection<ReportTag> ReportTags { get; set; } = new List<ReportTag>();
    public ICollection<ReportRelation> SourceRelations { get; set; } = new List<ReportRelation>();
    public ICollection<ReportRelation> TargetRelations { get; set; } = new List<ReportRelation>();
}

[Table("FieldBank")]
public class FieldBank
{
    [Key]
    public int FieldId { get; set; }
    
    [Required, MaxLength(150)]
    public string DisplayName { get; set; } = string.Empty;
    
    [MaxLength(150)]
    public string? TechnicalName { get; set; }
    
    [Required, MaxLength(50)]
    public string DataType { get; set; } = "NVARCHAR(50)";
    
    [MaxLength(1000)]
    public string? StandardDescription { get; set; }
    
    public string? DefaultFormula { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public ICollection<ReportField> ReportFields { get; set; } = new List<ReportField>();
}

[Table("ReportFields")]
public class ReportField
{
    [Key]
    public int ReportFieldId { get; set; }
    
    public int ReportId { get; set; }
    [ForeignKey(nameof(ReportId))]
    public Report? Report { get; set; }
    
    public int FieldId { get; set; }
    [ForeignKey(nameof(FieldId))]
    public FieldBank? Field { get; set; }
    
    public int DisplayOrder { get; set; }
    public string? CustomFormula { get; set; }
    
    [MaxLength(1000)]
    public string? CustomNote { get; set; }
}

[Table("ReportParameters")]
public class ReportParameter
{
    [Key]
    public int ParameterId { get; set; }
    
    public int ReportId { get; set; }
    [ForeignKey(nameof(ReportId))]
    public Report? Report { get; set; }
    
    [Required, MaxLength(150)]
    public string ParameterName { get; set; } = string.Empty;
    
    [Required, MaxLength(50)]
    public string DataType { get; set; } = "NVARCHAR(50)";
    
    public bool IsRequired { get; set; }
    
    [MaxLength(500)]
    public string? Description { get; set; }
}

[Table("ParameterBank")]
public class ParameterBank
{
    [Key]
    public int ParameterBankId { get; set; }
    
    [Required, MaxLength(150)]
    public string ParameterName { get; set; } = string.Empty;
    
    [Required, MaxLength(50)]
    public string DataType { get; set; } = "NVARCHAR(50)";
    
    public bool DefaultIsRequired { get; set; }
    
    [MaxLength(500)]
    public string? Description { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[Table("Tags")]
public class Tag
{
    [Key]
    public int TagId { get; set; }
    
    [Required, MaxLength(100)]
    public string TagName { get; set; } = string.Empty;
    
    [MaxLength(10)]
    public string? ColorHex { get; set; } = "#3B82F6";
    
    public ICollection<ReportTag> ReportTags { get; set; } = new List<ReportTag>();
}

[Table("ReportTags")]
public class ReportTag
{
    public int ReportId { get; set; }
    [ForeignKey(nameof(ReportId))]
    public Report? Report { get; set; }
    
    public int TagId { get; set; }
    [ForeignKey(nameof(TagId))]
    public Tag? Tag { get; set; }
}

[Table("ReportRelations")]
public class ReportRelation
{
    [Key]
    public int RelationId { get; set; }
    
    public int SourceReportId { get; set; }
    [ForeignKey(nameof(SourceReportId))]
    public Report? SourceReport { get; set; }
    
    public int TargetReportId { get; set; }
    [ForeignKey(nameof(TargetReportId))]
    public Report? TargetReport { get; set; }
    
    public RelationType RelationType { get; set; }
    
    [MaxLength(1000)]
    public string? DifferenceSummary { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[Table("AuditLogs")]
public class AuditLog
{
    [Key]
    public long LogId { get; set; }
    
    [Required, MaxLength(50)]
    public string EntityName { get; set; } = string.Empty;
    
    public int EntityId { get; set; }
    
    [Required, MaxLength(50)]
    public string ActionType { get; set; } = string.Empty;
    
    public int? UserId { get; set; }
    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }
    
    public string? ChangeDetails { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
