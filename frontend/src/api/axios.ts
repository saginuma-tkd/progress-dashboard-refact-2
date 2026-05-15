import api from '../lib/api';

export const fetchPastResults = async (studentId: string) => {
    const response = await api.get(`/results/past-exams/${studentId}`);
    return response.data;
};

export const fetchMockResults = async (studentId: string) => {
    const response = await api.get(`/results/mock-exams/${studentId}`);
    return response.data;
};

export default api;
