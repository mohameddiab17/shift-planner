import { useQuery } from '@tanstack/react-query';
import adminService from "../../../../api/services/adminService.js";
import { useMemo } from 'react';

export function useAdminDashboard() {
  const {
    data,
    isLoading: loading,
    isFetching,
    error,
    refetch
  } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const [dashboardRes, statsRes] = await Promise.all([
        adminService.dashboard.getDashboard(),
        adminService.dashboard.getDashboardStats(),
      ]);
      return {
        dashboard: dashboardRes.data.data,
        stats: statsRes.data.data
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const { dashboard, stats } = data || {};

  const mergedBranch = useMemo(() => {
    if (!dashboard?.branch || !stats?.branch) return null;
    return {
      ...dashboard.branch,
      ...stats.branch,
    };
  }, [dashboard, stats]);

  return {
    loading,
    isFetching,
    error: error ? { message: error.message || "Failed to load dashboard data" } : null,
    refetch,

    // normalized data
    branch: mergedBranch,
    today: dashboard?.today,
    recentEmployees: dashboard?.recent_employees,
    thisWeek: stats?.this_week,
    upcoming: stats?.upcoming,
    reports: stats?.reports,
  };
}
