export type UserRole = 1 | 2 | 3; // 1: Analyst, 2: Manager, 3: SystemAdmin

export type TreeNodeType = 1 | 2; // 1: Folder, 2: Report

export type ReportStatus = 1 | 2 | 3; // 1: Pending, 2: InProgress, 3: Verified

export type RelationType = 1 | 2 | 3 | 4; // 1: Similar, 2: Replaces, 3: CustomVersion, 4: SubReport

export interface User {
  userId: number;
  username: string;
  fullName: string;
  roleId: number;
  roleName: string;
}

export interface UserDto {
  userId: number;
  username: string;
  fullName: string;
  roleId: number;
  roleName: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserDto {
  username: string;
  password: string;
  fullName: string;
  roleId: number;
}

export interface UpdateUserDto {
  fullName: string;
  roleId: number;
  isActive: boolean;
  newPassword?: string;
}

export interface TreeNode {
  nodeId: number;
  parentNodeId: number | null;
  title: string;
  nodeType: TreeNodeType;
  sortOrder: number;
  reportId?: number;
  reportCode?: string;
  status?: ReportStatus;
  isLocked: boolean;
  lockedByUserName?: string;
  children: TreeNode[];
}

export interface ReportFieldItem {
  fieldId: number;
  displayName: string;
  technicalName?: string;
  dataType?: string;
  displayOrder: number;
  customFormula?: string;
  customNote?: string;
}

export type UiControlType =
  | 'text'
  | 'date'
  | 'date_range'
  | 'datetime'
  | 'datetime_range'
  | 'number'
  | 'number_range'
  | 'radio'
  | 'checkbox'
  | 'tristate_checkbox'
  | 'dropdown'
  | 'checkbox_dropdown'
  | 'boolean';

export interface UiControlTypeOption {
  value: UiControlType;
  label: string;
  icon: string;
  description: string;
  hasOptions: boolean;
  example: string;
}

export const UI_CONTROL_TYPE_OPTIONS: UiControlTypeOption[] = [
  { value: 'text', label: 'متن آزاد', icon: '📝', description: 'ورودی متنی ساده', hasOptions: false, example: 'شرح سند، کلمه کلیدی' },
  { value: 'date_range', label: 'بازه تاریخ (از - تا)', icon: '📅', description: 'محدوده تاریخ شمسی با تقویم', hasOptions: false, example: 'از تاریخ ... تا تاریخ ...' },
  { value: 'datetime_range', label: 'بازه تاریخ و ساعت (از - تا)', icon: '⏰', description: 'محدوده تاریخ به همراه ساعت و دقیقه (AM/PM)', hasOptions: false, example: 'از تاریخ و ساعت ... تا تاریخ و ساعت ...' },
  { value: 'date', label: 'تک تاریخ', icon: '📆', description: 'انتخاب یک تاریخ مشخص', hasOptions: false, example: 'تا تاریخ معین، تاریخ ثبت' },
  { value: 'datetime', label: 'تک تاریخ و ساعت', icon: '⏱️', description: 'انتخاب یک تاریخ به همراه زمان معین', hasOptions: false, example: 'تاریخ و ساعت ثبت سند' },
  { value: 'checkbox_dropdown', label: 'منوی کشویی با فعال‌ساز چک‌باکس', icon: '☑️🔽', description: 'منوی انتخابی که با زدن تیک فعال می‌شود', hasOptions: true, example: 'بر اساس صندوق‌دار (صندوق ۱, صندوق ۲)' },
  { value: 'tristate_checkbox', label: 'چک‌باکس ۳ حالته (خالی / تیک / مربع)', icon: '⏹️', description: 'دارای ۳ حالت: خالی (خیر)، تیک (بله)، مربع پر (بی‌تفاوت / همه)', hasOptions: false, example: 'اسناد اتوماتیک، وضعیت تسویه' },
  { value: 'radio', label: 'رادیوباتن (تک‌انتخابی)', icon: '🔘', description: 'انتخاب یک گزینه از بین گزینه‌های ثابت', hasOptions: true, example: 'رسمی, غیررسمی' },
  { value: 'checkbox', label: 'چک‌باکس (چندانتخابی / گروهی)', icon: '☑️', description: 'انتخاب یک یا چند گزینه هم‌زمان (افقی یا عمودی)', hasOptions: true, example: 'نمایش سرجمع‌های صفر, نمایش ردیف‌های صفر, نمایش جزییات' },
  { value: 'dropdown', label: 'منوی کشویی (Dropdown)', icon: '🔽', description: 'لیست بازشونده از مقادیر', hasOptions: true, example: 'نقدی, اعتباری, چکی' },
  { value: 'number_range', label: 'بازه عددی / ریالی (از - تا)', icon: '🔢', description: 'تعیین کف و سقف مقدار عددی', hasOptions: false, example: 'از مبلغ ... تا مبلغ ...' },
  { value: 'number', label: 'عددی ساده', icon: '🔢', description: 'ورودی عددی تک‌مقداری', hasOptions: false, example: 'حداقل تعداد' },
  { value: 'boolean', label: 'سوئیچ بله / خیر', icon: '⚡', description: 'کلید دو وضعیتی فعال / غیرفعال', hasOptions: false, example: 'فقط اقلام فعال' },
];

export interface ReportParameterItem {
  parameterId: number;
  parameterName: string;
  dataType?: string;
  isRequired: boolean;
  description?: string;
  uiControlType?: string;
  controlConfigJson?: string;
}

export interface Tag {
  tagId: number;
  tagName: string;
  colorHex?: string;
}

export interface ReportRelationItem {
  relationId: number;
  targetReportId: number;
  targetReportCode: string;
  targetTitle: string;
  relationType: RelationType;
  differenceSummary?: string;
}

export interface ReportDetail {
  reportId: number;
  nodeId: number;
  reportCode: string;
  title: string;
  functionalDescription?: string;
  calculationFormula?: string;
  sqlQuery?: string;
  status: ReportStatus;
  verifiedByUserId?: number;
  verifiedByUserName?: string;
  verifiedAt?: string;
  isLocked: boolean;
  lockedByUserId?: number;
  lockedByUserName?: string;
  lockedAt?: string;
  lockSessionId?: string;
  updatedAt: string;
  fields: ReportFieldItem[];
  parameters: ReportParameterItem[];
  tags: Tag[];
  relations: ReportRelationItem[];
}

export interface FieldBankItem {
  fieldId: number;
  displayName: string;
  technicalName?: string;
  standardDescription?: string;
}

export interface ParameterBankItem {
  parameterBankId: number;
  parameterName: string;
  dataType: string;
  defaultIsRequired: boolean;
  description?: string;
  uiControlType?: string;
  controlConfigJson?: string;
}

export interface SearchResultItem {
  reportId: number;
  reportCode: string;
  title: string;
  status: ReportStatus;
  moduleTitle?: string;
  tagNames: string[];
  fieldCount: number;
  matchedFieldCount: number;
}

export interface FieldDiffItem {
  fieldId: number;
  displayName: string;
  technicalName: string;
  existsInReportA: boolean;
  existsInReportB: boolean;
  formulaA?: string;
  formulaB?: string;
  customNoteA?: string;
  customNoteB?: string;
  hasFormulaDifference: boolean;
}

export interface ParameterDiffItem {
  parameterName: string;
  existsInReportA: boolean;
  existsInReportB: boolean;
  isRequiredA?: boolean;
  isRequiredB?: boolean;
  uiControlTypeA?: string;
  uiControlTypeB?: string;
}

export interface DiffResponse {
  reportA: ReportDetail;
  reportB: ReportDetail;
  fieldDiffs: FieldDiffItem[];
  parameterDiffs: ParameterDiffItem[];
}

export interface MultiReportFieldPresence {
  reportId: number;
  reportCode: string;
  reportTitle: string;
  exists: boolean;
  displayOrder: number;
  customFormula?: string;
  customNote?: string;
}

export interface MultiReportFieldDiff {
  fieldId: number;
  displayName: string;
  technicalName?: string;
  isCommonToAll: boolean;
  hasFormulaDifference: boolean;
  presence: MultiReportFieldPresence[];
}

export interface MultiReportParamPresence {
  reportId: number;
  reportCode: string;
  exists: boolean;
  isRequired?: boolean;
  dataType?: string;
  uiControlType?: string;
}

export interface MultiReportParamDiff {
  parameterName: string;
  isCommonToAll: boolean;
  presence: MultiReportParamPresence[];
}

export interface MultiReportDiffResponse {
  reports: ReportDetail[];
  fieldDiffs: MultiReportFieldDiff[];
  parameterDiffs: MultiReportParamDiff[];
}

// ==========================================
// انواع داده‌های مربوط به دامنه دسترسی‌ها (Permissions Domain)
// ==========================================

export type SystemDomain = 'reports' | 'permissions' | 'configs';

export interface PermissionTreeNode {
  nodeId: number;
  parentNodeId: number | null;
  title: string;
  resourceCode?: string;
  sortOrder: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
  totalPermissionsCount: number;
  verifiedCount: number;
  underReviewCount: number;
  pendingCount: number;
  lockedCount: number;
  children: PermissionTreeNode[];
  permissions: PermissionItem[];
}

export interface PermissionItem {
  permissionId: number;
  nodeId: number;
  nodeTitle?: string;
  nodeResourceCode?: string;
  persianName: string;
  englishName?: string;
  resourceNumber: string;
  description?: string;
  status: ReportStatus; // 1: Pending (در انتظار), 2: InProgress (قابل بررسی), 3: Verified (تایید شده)
  verifiedByUserId?: number;
  verifiedByUserName?: string;
  verifiedAt?: string;
  isLocked: boolean;
  lockedByUserId?: number;
  lockedByUserName?: string;
  lockedAt?: string;
  lockSessionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePermissionTreeNodeDto {
  parentNodeId?: number | null;
  title: string;
  resourceCode?: string;
  sortOrder?: number;
  description?: string;
}

export interface UpdatePermissionTreeNodeDto {
  parentNodeId?: number | null;
  title: string;
  resourceCode?: string;
  sortOrder?: number;
  description?: string;
}

export interface CreatePermissionItemDto {
  nodeId: number;
  persianName: string;
  englishName?: string;
  resourceNumber: string;
  description?: string;
}

export interface UpdatePermissionItemDto {
  persianName: string;
  englishName?: string;
  resourceNumber: string;
  description?: string;
  nodeId?: number;
}

