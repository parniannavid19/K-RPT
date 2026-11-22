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

export interface ReportParameterItem {
  parameterId: number;
  parameterName: string;
  dataType?: string;
  isRequired: boolean;
  description?: string;
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
