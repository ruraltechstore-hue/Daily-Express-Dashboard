import { useQuery } from '@tanstack/react-query';
import { fetchReportsData } from '@/features/reports/api/reports.api';

const REPORTS_KEY = ['reports'];

export function useReportsData(dateRange: { from: Date; to: Date }) {
  return useQuery({
    queryKey: [...REPORTS_KEY, dateRange],
    queryFn: () => fetchReportsData(dateRange),
    staleTime: 5 * 60 * 1000, // Cache for 5 mins
  });
}
