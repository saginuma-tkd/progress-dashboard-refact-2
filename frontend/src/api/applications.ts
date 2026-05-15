import api from '../lib/api';

export const getTransferRequests = async () => {
    const response = await api.get('/applications/transfer');
    return response.data;
};

export const getAbsenceReports = async () => {
    const response = await api.get('/applications/absence');
    return response.data;
};

export const updateTransferStatus = async (id: number, status: string) => {
    const response = await api.patch(`/applications/transfer/${id}/status`, { status });
    return response.data;
};

export const updateAbsenceStatus = async (id: number, status: string) => {
    const response = await api.patch(`/applications/absence/${id}/status`, { status });
    return response.data;
};
