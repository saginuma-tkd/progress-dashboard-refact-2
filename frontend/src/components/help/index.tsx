// index.ts
// ヘルプコンテンツ全エクスポート

export type { HelpContent, HelpSection } from "./helpDashboard";

// ダッシュボード・進捗
export { helpDashboard, helpEikenDialog, helpMemoDialog } from "./helpDashboard";
export { helpProgressList, helpAddBookDialog, helpUpdateProgressDialog } from "./helpProgressList";

// 過去問 / 模試 / 入試
export {
  helpPastExam,
  helpPastExamAddDialog,
  helpMockExamAddDialog,
  helpMockExamDetailDialog,
  helpEntranceExamAddDialog,
} from "./helpPastExam";

// 教材・ルート表
export {
  helpMaterialSearch,
  helpMaterialUploadDialog,
  helpMaterialMemoDialog,
} from "./helpMaterialSearch";

// 申請確認・承認
export { helpApplicationReview, helpTransferApprovalDialog } from "./helpApplicationReview";

// 生徒向けページ
export { helpSubmitResults, helpTransferRequest, helpAbsenceReport } from "./helpStudentPages";

// 校舎管理者メニュー
export {
  helpAdminTop,
  helpUserManagement,
  helpStudentManagement,
  helpTextbookManagement,
  helpTeachingMaterialManagement,
  helpPresetManagement,
  helpMockExamList,
  helpStudyTimeVerification,
  helpAttendanceManagement,
  helpSchoolEventManagement,
} from "./helpAdmin";

// テナント管理者メニュー
export {
  helpDeveloperTop,
  helpSchoolManagement,
  helpRoleManagement,
  helpGradeUpdateManagement,
  helpPasswordReset,
  helpCsvImport,
  helpSubjectManagement,
  helpRouteLevelManagement,
  helpFormulaManagement,
  helpAuditLog,
} from "./helpDeveloper";

// システム管理者ページ
export {
  helpSystemAdminDashboard,
  helpDbViewer,
  helpDbDownloadUpload,
  helpAdminManagement,
  helpMaintenanceMode,
  helpChangelogManagement,
} from "./helpSuperAdmin";
