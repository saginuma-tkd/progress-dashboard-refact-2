// frontend/src/api/applications.ts

import api from '../lib/api';

// 🌟 検索条件をすべて受け取れるように型を定義
export interface FilterParams {
  start_date?: string;
  end_date?: string;
  status?: string;
  student_id?: string;
  instructor_id?: string;
}

// 🌟 paramsを丸ごとバックエンドに送るように変更！
export const getTransferRequests = async (params: FilterParams = {}) => {
  const res = await api.get('/applications/transfer', { params });
  return res.data;
};

export const getAbsenceReports = async (params: FilterParams = {}) => {
  const res = await api.get('/applications/absence', { params });
  return res.data;
};

export const updateTransferStatus = async (
  id: number,
  data: { status: string; approved_date?: string; instructor_comment?: string }
) => {
  const res = await api.patch(`/applications/transfer/${id}/status`, data);
  return res.data;
};

export const updateAbsenceStatus = async (id: number, status: string) => {
  const res = await api.patch(`/applications/absence/${id}/status`, { status });
  return res.data;
};