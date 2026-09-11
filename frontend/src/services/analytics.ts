import { apiRequest } from './api';
import { DashboardMetrics } from '../types';

export const analyticsService = {
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    return apiRequest<DashboardMetrics>('/analytics/dashboard');
  },
};
