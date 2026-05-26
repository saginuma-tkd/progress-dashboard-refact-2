import api from '../lib/api';

// ==========================================
// 取得系 (Fetch)
// ==========================================

export const fetchPastResults = async (studentId: string | number) => {
    const response = await api.get(`/exams/pastexam/${studentId}`);
    return response.data;
};

export const fetchMockResults = async (studentId: string | number) => {
    const response = await api.get(`/exams/mock/${studentId}`);
    return response.data;
};

export const fetchEntranceSchedules = async (studentId: string | number) => {
    const response = await api.get(`/exams/acceptance/${studentId}`);
    return response.data;
};


// ==========================================
// 作成系 (Create)
// ==========================================

export const createPastExam = async (data: any) => {
    const response = await api.post('/exams/pastexam', data);
    return response.data;
};

export const createMockExam = async (data: any) => {
    const response = await api.post('/exams/mock', data);
    return response.data;
};

export const createEntranceSchedule = async (data: any) => {
    const response = await api.post('/exams/acceptance', data);
    return response.data;
};

// ※必要に応じて update や delete もここに追加していきます