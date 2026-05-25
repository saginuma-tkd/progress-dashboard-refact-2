import { useQuery } from '@tanstack/react-query';
import { getTransferRequests, getAbsenceReports, FilterParams } from '../api/applications';
import dayjs from 'dayjs';

const getCurrentAcademicYear = () => {
  const now = dayjs();
  const startYear = now.month() < 2 ? now.year() - 1 : now.year();
  return {
    startDate: `${startYear}-03-01`,
    endDate: dayjs(`${startYear + 1}-03-01`).subtract(1, 'day').format('YYYY-MM-DD')
  };
};

// 🌟 引数で検索条件（filters）を受け取るように変更！
export function useApplications(filters: FilterParams = {}) {
  return useQuery({
    // 🌟 queryKeyにfiltersを含めることで、検索条件が変わるたびに自動で再取得（フワッと更新）されます！
    queryKey: ['applications', filters],
    queryFn: async () => {
      const defaultDates = getCurrentAcademicYear();
      const finalParams = {
        ...filters, // UIで指定された条件を展開
        // 日付が指定されていなければデフォルト年度を入れる
        start_date: filters.start_date || defaultDates.startDate,
        end_date: filters.end_date || defaultDates.endDate,
      };

      const [transfers, absences] = await Promise.all([
        getTransferRequests(finalParams),
        getAbsenceReports(finalParams),
      ]);
      return { transfers, absences };
    },
  });
}