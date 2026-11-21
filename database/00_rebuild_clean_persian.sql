USE ReportCatalogDb;
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- حذف جداول قدیمی به ترتیب وابستگی کلید خارجی
DROP TABLE IF EXISTS dbo.AuditLogs;
DROP TABLE IF EXISTS dbo.ReportRelations;
DROP TABLE IF EXISTS dbo.ReportTags;
DROP TABLE IF EXISTS dbo.Tags;
DROP TABLE IF EXISTS dbo.ReportParameters;
DROP TABLE IF EXISTS dbo.ReportFields;
DROP TABLE IF EXISTS dbo.Reports;
DROP TABLE IF EXISTS dbo.ReportTreeNodes;
DROP TABLE IF EXISTS dbo.FieldBank;
DROP TABLE IF EXISTS dbo.Users;
DROP TABLE IF EXISTS dbo.Roles;
GO

-- ============================================================================
-- ایجاد جداول با پشتیبانی کامل از یونیکد (NVARCHAR)
-- ============================================================================

-- ۱. نقش‌ها
CREATE TABLE dbo.Roles (
    RoleId TINYINT NOT NULL PRIMARY KEY,
    RoleName NVARCHAR(50) NOT NULL UNIQUE,
    TitleFa NVARCHAR(100) NOT NULL,
    Description NVARCHAR(250) NULL
);
GO

-- ۲. کاربران
CREATE TABLE dbo.Users (
    UserId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Username NVARCHAR(100) NOT NULL CONSTRAINT UQ_Users_Username UNIQUE,
    PasswordHash NVARCHAR(500) NOT NULL,
    FullName NVARCHAR(150) NOT NULL,
    RoleId TINYINT NOT NULL CONSTRAINT FK_Users_Roles FOREIGN KEY REFERENCES dbo.Roles(RoleId),
    IsActive BIT NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT (1),
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT (SYSUTCDATETIME())
);
GO

-- ۳. ساختار درختی
CREATE TABLE dbo.ReportTreeNodes (
    NodeId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    ParentNodeId INT NULL CONSTRAINT FK_ReportTreeNodes_Parent FOREIGN KEY REFERENCES dbo.ReportTreeNodes(NodeId),
    Title NVARCHAR(200) NOT NULL,
    NodeType TINYINT NOT NULL CONSTRAINT CK_ReportTreeNodes_NodeType CHECK (NodeType IN (1, 2)), -- 1: ماژول, 2: گزارش
    SortOrder INT NOT NULL CONSTRAINT DF_ReportTreeNodes_SortOrder DEFAULT (0),
    HierarchyPath HIERARCHYID NULL
);
GO

-- ۴. شناسنامه گزارش‌ها
CREATE TABLE dbo.Reports (
    ReportId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    NodeId INT NOT NULL CONSTRAINT UQ_Reports_NodeId UNIQUE CONSTRAINT FK_Reports_TreeNodes FOREIGN KEY REFERENCES dbo.ReportTreeNodes(NodeId) ON DELETE CASCADE,
    ReportCode NVARCHAR(50) NOT NULL CONSTRAINT UQ_Reports_ReportCode UNIQUE,
    Title NVARCHAR(250) NOT NULL,
    FunctionalDescription NVARCHAR(MAX) NULL,
    CalculationFormula NVARCHAR(MAX) NULL,
    Status TINYINT NOT NULL CONSTRAINT DF_Reports_Status DEFAULT (1) CONSTRAINT CK_Reports_Status CHECK (Status IN (1, 2, 3)), -- 1: در انتظار بررسی, 2: در حال تکمیل/ویرایش, 3: بررسی و تایید شده
    VerifiedByUserId INT NULL CONSTRAINT FK_Reports_VerifiedUser FOREIGN KEY REFERENCES dbo.Users(UserId),
    VerifiedAt DATETIME2(3) NULL,
    LockedByUserId INT NULL CONSTRAINT FK_Reports_LockedUser FOREIGN KEY REFERENCES dbo.Users(UserId),
    LockedAt DATETIME2(3) NULL,
    LockHeartbeatAt DATETIME2(3) NULL,
    LockSessionId UNIQUEIDENTIFIER NULL,
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Reports_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Reports_UpdatedAt DEFAULT (SYSUTCDATETIME())
);
GO

-- ۵. بانک مرکزی فیلدها
CREATE TABLE dbo.FieldBank (
    FieldId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    DisplayName NVARCHAR(150) NOT NULL,
    TechnicalName NVARCHAR(150) NULL,
    DataType NVARCHAR(50) NOT NULL,
    StandardDescription NVARCHAR(1000) NULL,
    DefaultFormula NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_FieldBank_CreatedAt DEFAULT (SYSUTCDATETIME())
);
GO

-- ۶. فیلدهای هر گزارش
CREATE TABLE dbo.ReportFields (
    ReportFieldId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    ReportId INT NOT NULL CONSTRAINT FK_ReportFields_Reports FOREIGN KEY REFERENCES dbo.Reports(ReportId) ON DELETE CASCADE,
    FieldId INT NOT NULL CONSTRAINT FK_ReportFields_FieldBank FOREIGN KEY REFERENCES dbo.FieldBank(FieldId),
    DisplayOrder INT NOT NULL CONSTRAINT DF_ReportFields_Order DEFAULT (0),
    CustomFormula NVARCHAR(MAX) NULL,
    CustomNote NVARCHAR(1000) NULL,
    CONSTRAINT UQ_ReportFields_Report_Field UNIQUE (ReportId, FieldId)
);
GO

-- ۷. پارامترهای ورودی
CREATE TABLE dbo.ReportParameters (
    ParameterId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    ReportId INT NOT NULL CONSTRAINT FK_ReportParameters_Reports FOREIGN KEY REFERENCES dbo.Reports(ReportId) ON DELETE CASCADE,
    ParameterName NVARCHAR(150) NOT NULL,
    DataType NVARCHAR(50) NOT NULL,
    IsRequired BIT NOT NULL CONSTRAINT DF_ReportParameters_IsRequired DEFAULT (0),
    Description NVARCHAR(500) NULL
);
GO

-- ۸. برچسب‌ها
CREATE TABLE dbo.Tags (
    TagId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    TagName NVARCHAR(100) NOT NULL CONSTRAINT UQ_Tags_TagName UNIQUE,
    ColorHex VARCHAR(10) NULL CONSTRAINT DF_Tags_Color DEFAULT ('#3B82F6')
);
GO

-- ۹. ارتباط برچسب‌ها و گزارش‌ها
CREATE TABLE dbo.ReportTags (
    ReportId INT NOT NULL CONSTRAINT FK_ReportTags_Reports FOREIGN KEY REFERENCES dbo.Reports(ReportId) ON DELETE CASCADE,
    TagId INT NOT NULL CONSTRAINT FK_ReportTags_Tags FOREIGN KEY REFERENCES dbo.Tags(TagId) ON DELETE CASCADE,
    CONSTRAINT PK_ReportTags PRIMARY KEY (ReportId, TagId)
);
GO

-- ۱۰. ارتباط بین گزارش‌ها
CREATE TABLE dbo.ReportRelations (
    RelationId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    SourceReportId INT NOT NULL CONSTRAINT FK_ReportRelations_Source FOREIGN KEY REFERENCES dbo.Reports(ReportId),
    TargetReportId INT NOT NULL CONSTRAINT FK_ReportRelations_Target FOREIGN KEY REFERENCES dbo.Reports(ReportId),
    RelationType TINYINT NOT NULL CONSTRAINT CK_ReportRelations_Type CHECK (RelationType IN (1, 2, 3, 4)),
    DifferenceSummary NVARCHAR(1000) NULL,
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_ReportRelations_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT CK_ReportRelations_SelfRef CHECK (SourceReportId <> TargetReportId)
);
GO

-- ۱۱. تاریخچه تغییرات
CREATE TABLE dbo.AuditLogs (
    LogId BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    EntityName NVARCHAR(50) NOT NULL,
    EntityId INT NOT NULL,
    ActionType NVARCHAR(50) NOT NULL,
    UserId INT NULL CONSTRAINT FK_AuditLogs_Users FOREIGN KEY REFERENCES dbo.Users(UserId),
    ChangeDetails NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_AuditLogs_CreatedAt DEFAULT (SYSUTCDATETIME())
);
GO

-- ============================================================================
-- ایندکس‌های کارایی
-- ============================================================================
CREATE NONCLUSTERED INDEX IX_ReportFields_FieldId_ReportId ON dbo.ReportFields (FieldId, ReportId);
CREATE NONCLUSTERED INDEX IX_ReportTreeNodes_Parent_Sort ON dbo.ReportTreeNodes (ParentNodeId, SortOrder);
CREATE NONCLUSTERED INDEX IX_ReportTreeNodes_HierarchyPath ON dbo.ReportTreeNodes (HierarchyPath);
CREATE NONCLUSTERED INDEX IX_Reports_Status ON dbo.Reports (Status);
CREATE NONCLUSTERED INDEX IX_AuditLogs_Entity ON dbo.AuditLogs (EntityName, EntityId, CreatedAt DESC);
CREATE NONCLUSTERED INDEX IX_Reports_LockStatus ON dbo.Reports (LockedByUserId, LockHeartbeatAt) WHERE LockedByUserId IS NOT NULL;
GO

-- ============================================================================
-- درج داده‌های پایه با پیشوند استاندارد N و انکودینگ یونیکد
-- ============================================================================

INSERT INTO dbo.Roles (RoleId, RoleName, TitleFa, Description) VALUES
(1, 'Analyst', N'کارشناس', N'مشاهده، جستجو، قفل‌گذاری و تایید نهایی گزارش‌ها'),
(2, 'Manager', N'مدیر', N'مدیریت و ویرایش فرمول‌ها، فیلدها، پارامترها و تگ‌ها'),
(3, 'SystemAdmin', N'مدیر سیستم', N'مدیریت کامل سیستم، درخت گزارش‌ها و کاربران');
GO

INSERT INTO dbo.Users (Username, PasswordHash, FullName, RoleId, IsActive) VALUES
('admin', '$2a$11$qR0k6jVqA.bZ75z1f8u05O8H4y7Lz48w8hGgT1tKqQ5iWpXbU7K6G', N'مدیر ارشد سامانه', 3, 1),
('analyst1', '$2a$11$qR0k6jVqA.bZ75z1f8u05O8H4y7Lz48w8hGgT1tKqQ5iWpXbU7K6G', N'کارشناس بررسی و تحلیل', 1, 1);
GO

INSERT INTO dbo.ReportTreeNodes (ParentNodeId, Title, NodeType, SortOrder, HierarchyPath) VALUES 
(NULL, N'سیستم مالی و حسابداری', 1, 1, hierarchyid::Parse('/1/')),
(NULL, N'سیستم انبار و موجودی کالا', 1, 2, hierarchyid::Parse('/2/')),
(NULL, N'سیستم فروش و توزیع', 1, 3, hierarchyid::Parse('/3/')),
(NULL, N'سیستم خزانه‌داری و دریافت/پرداخت', 1, 4, hierarchyid::Parse('/4/'));
GO

INSERT INTO dbo.FieldBank (DisplayName, TechnicalName, DataType, StandardDescription, DefaultFormula) VALUES 
(N'کد کالا', N'ItemCode', N'NVARCHAR(50)', N'شناسه یکتای کالا در سازمان', NULL),
(N'بارکد کالا', N'Barcode', N'NVARCHAR(50)', N'بارکد استاندارد روی بسته‌بندی کالا', NULL),
(N'قیمت خرید واحد', N'BuyUnitPrice', N'DECIMAL(18,2)', N'آخرین نرخ خرید کالا بدون مالیات', NULL),
(N'قیمت فروش واحد', N'SaleUnitPrice', N'DECIMAL(18,2)', N'قیمت مصوب عرضه کالا به مشتری', NULL),
(N'تعداد / مقدار', N'Quantity', N'DECIMAL(18,3)', N'مقدار جابجایی یا موجودی فیزیکی', NULL),
(N'مبلغ کل', N'TotalAmount', N'DECIMAL(18,2)', N'مبلغ کل قبل از تخفیف', N'@تعداد * @قیمت_واحد'),
(N'مبلغ تخفیف', N'DiscountAmount', N'DECIMAL(18,2)', N'تخفیف اعمال‌شده روی سطر یا سند', NULL),
(N'مبلغ خالص', N'NetAmount', N'DECIMAL(18,2)', N'مبلغ قابل پرداخت پس از کسر تخفیف و افزودن مالیات', N'@مبلغ_کل - @مبلغ_تخفیف + @مبلغ_مالیات'),
(N'تاریخ سند', N'DocDate', N'NVARCHAR(10)', N'تاریخ ثبت سند به صورت هجری شمسی (YYYY/MM/DD)', NULL),
(N'کد مرکز هزینه', N'CostCenterCode', N'NVARCHAR(50)', N'کد تفصیلی مرکز هزینه مربوطه', NULL);
GO

INSERT INTO dbo.Tags (TagName, ColorHex) VALUES 
(N'مغایرت‌گیری', '#EF4444'),
(N'تجمیعی', '#3B82F6'),
(N'ریالی', '#10B981'),
(N'تعدادی', '#F59E0B'),
(N'مشتری_خاص', '#8B5CF6'),
(N'پایان_دوره', '#6B7280');
GO

-- درج گزارش نمونه
DECLARE @SalesNodeId INT = (SELECT NodeId FROM dbo.ReportTreeNodes WHERE Title = N'سیستم فروش و توزیع');
DECLARE @ReportNodeId INT;
DECLARE @ReportId INT;

INSERT INTO dbo.ReportTreeNodes (ParentNodeId, Title, NodeType, SortOrder, HierarchyPath)
VALUES (@SalesNodeId, N'گزارش فروش و سود ناخالص اقلام', 2, 1, hierarchyid::Parse('/3/1/'));

SET @ReportNodeId = SCOPE_IDENTITY();

INSERT INTO dbo.Reports (NodeId, ReportCode, Title, FunctionalDescription, CalculationFormula, Status)
VALUES (
    @ReportNodeId,
    'SLS-RPT-101',
    N'گزارش فروش و سود ناخالص اقلام',
    N'این گزارش برای ارزیابی حجم فروش ریالی و تعدادی کالاها و محاسبه حاشیه سود به کار می‌رود.',
    N'سود ناخالص = مبلغ خالص فروش - (تعداد * قیمت خرید واحد)',
    1
);

SET @ReportId = SCOPE_IDENTITY();

INSERT INTO dbo.ReportFields (ReportId, FieldId, DisplayOrder, CustomNote)
SELECT @ReportId, FieldId, 1, N'کد کالا در سیستم انبار' FROM dbo.FieldBank WHERE TechnicalName = 'ItemCode'
UNION ALL
SELECT @ReportId, FieldId, 2, NULL FROM dbo.FieldBank WHERE TechnicalName = 'Quantity'
UNION ALL
SELECT @ReportId, FieldId, 3, NULL FROM dbo.FieldBank WHERE TechnicalName = 'SaleUnitPrice'
UNION ALL
SELECT @ReportId, FieldId, 4, N'مبنا: میانگین موزون قیمت خرید' FROM dbo.FieldBank WHERE TechnicalName = 'BuyUnitPrice'
UNION ALL
SELECT @ReportId, FieldId, 5, NULL FROM dbo.FieldBank WHERE TechnicalName = 'NetAmount';

INSERT INTO dbo.ReportParameters (ReportId, ParameterName, DataType, IsRequired, Description)
VALUES 
    (@ReportId, N'از تاریخ', N'NVARCHAR(10)', 1, N'تاریخ شروع بازه فروش'),
    (@ReportId, N'تا تاریخ', N'NVARCHAR(10)', 1, N'تاریخ پایان بازه فروش'),
    (@ReportId, N'مرکز فروش/شعبه', N'INT', 0, N'اختیاری: فیلتر روی یک شعبه خاص');

INSERT INTO dbo.ReportTags (ReportId, TagId)
SELECT @ReportId, TagId FROM dbo.Tags WHERE TagName IN (N'ریالی', N'تعدادی');
GO

PRINT N'✅ بازسازی کامل با پشتیبانی ۱۰۰٪ یونیکد و متون فارسی انجام شد.';
GO
