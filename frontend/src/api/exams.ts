import api from '../lib/api';

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
