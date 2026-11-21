namespace KRpt.Core.Enums;

public enum UserRole : byte
{
    Analyst = 1,
    Manager = 2,
    SystemAdmin = 3
}

public enum TreeNodeType : byte
{
    Folder = 1,
    Report = 2
}

public enum ReportStatus : byte
{
    Pending = 1,
    InProgress = 2,
    Verified = 3
}

public enum RelationType : byte
{
    Similar = 1,
    Replaces = 2,
    CustomVersion = 3,
    SubReport = 4
}
