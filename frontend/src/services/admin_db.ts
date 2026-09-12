import { apiRequest } from './api';

export interface DatabaseActionResponse {
  status: string;
  action: string;
  message: string;
  details: Record<string, any>;
  timestamp: string;
}

export const adminDbService = {
  async performAction(
    action: 'clear_attempts' | 'reset_and_reseed' | 'drop_database',
    confirmationCode: string
  ): Promise<DatabaseActionResponse> {
    return apiRequest<DatabaseActionResponse>('/admin/database/action', {
      method: 'POST',
      body: JSON.stringify({
        action,
        confirmation_code: confirmationCode,
      }),
    });
  },
};
