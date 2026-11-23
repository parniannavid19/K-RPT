using KRpt.Core.Enums;

namespace KRpt.Core.DTOs;

public class PermissionTreeNodeDto
{
    public int NodeId { get; set; }
    public int? ParentNodeId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? ResourceCode { get; set; }
    public int SortOrder { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    // خلاصه آمار دسترسی‌های این سطح و زیرشاخه‌ها
    public int TotalPermissionsCount { get; set; }
    public int VerifiedCount { get; set; }
    public int UnderReviewCount { get; set; }
    public int PendingCount { get; set; }
    public int LockedCount { get; set; }

    public List<PermissionTreeNodeDto> Children { get; set; } = new();
    public List<PermissionItemDto> Permissions { get; set; } = new();
}

public class CreatePermissionTreeNodeDto
{
    public int? ParentNodeId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? ResourceCode { get; set; }
    public int SortOrder { get; set; }
    public string? Description { get; set; }
}

public class UpdatePermissionTreeNodeDto
{
    public int? ParentNodeId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? ResourceCode { get; set; }
    public int SortOrder { get; set; }
    public string? Description { get; set; }
}

public class PermissionItemDto
{
    public int PermissionId { get; set; }
    public int NodeId { get; set; }
    public string? NodeTitle { get; set; }
    public string? NodeResourceCode { get; set; }
    public string PersianName { get; set; } = string.Empty;
    public string? EnglishName { get; set; }
    public string ResourceNumber { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ReportStatus Status { get; set; }
    
    public int? VerifiedByUserId { get; set; }
    public string? VerifiedByUserName { get; set; }
    public DateTime? VerifiedAt { get; set; }
    
    public bool IsLocked { get; set; }
    public int? LockedByUserId { get; set; }
    public string? LockedByUserName { get; set; }
    public DateTime? LockedAt { get; set; }
    public Guid? LockSessionId { get; set; }
    
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreatePermissionItemDto
{
    public int NodeId { get; set; }
    public string PersianName { get; set; } = string.Empty;
    public string? EnglishName { get; set; }
    public string ResourceNumber { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class UpdatePermissionItemDto
{
    public string PersianName { get; set; } = string.Empty;
    public string? EnglishName { get; set; }
    public string ResourceNumber { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? NodeId { get; set; }
}
