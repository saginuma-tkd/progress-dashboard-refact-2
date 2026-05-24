// frontend/src/api/applications.ts (新しく作成して以下を貼り付け)

import api from '../lib/api'; // 👈 axiosの設定ファイル（または lib/api.ts）を読み込みます

// 振替申請の一覧取得
export const getTransferRequests = async () => {
  const res = await api.get('/applications/transfer');
  return res.data;
};

// 欠席報告の一覧取得
export const getAbsenceReports = async () => {
  const res = await api.get('/applications/absence');
  return res.data;
};

// 🌟 振替申請のステータス更新（日付とコメントも一緒に送れるようにしています）
export const updateTransferStatus = async (
  id: number, 
  data: { status: string; approved_date?: string; instructor_comment?: string }
) => {
  const res = await api.patch(`/applications/transfer/${id}/status`, data);
  return res.data;
};

// 欠席報告のステータス更新
export const updateAbsenceStatus = async (id: number, status: string) => {
  const res = await api.patch(`/applications/absence/${id}/status`, { status });
  return res.data;
};