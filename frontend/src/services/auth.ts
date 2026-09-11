import { apiRequest } from './api';
import { User, AuthResponse, TwoFactorSetupResponse } from '../types';

export const authService = {
  async login(email: string, password: string, otp_code?: string): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, otp_code }),
    });
  },

  async register(data: {
    name: string;
    email: string;
    password: string;
    student_id?: string;
    role?: string;
  }): Promise<User> {
    return apiRequest<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getMe(): Promise<User> {
    return apiRequest<User>('/auth/me');
  },

  async getStudents(): Promise<User[]> {
    return apiRequest<User[]>('/auth/students');
  },

  async setup2FA(): Promise<TwoFactorSetupResponse> {
    return apiRequest<TwoFactorSetupResponse>('/auth/2fa/setup', {
      method: 'POST',
    });
  },

  async enable2FA(code: string): Promise<{ status: string; message: string }> {
    return apiRequest<{ status: string; message: string }>('/auth/2fa/enable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  async disable2FA(code: string): Promise<{ status: string; message: string }> {
    return apiRequest<{ status: string; message: string }>('/auth/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  async get2FAStatus(): Promise<{ is_2fa_enabled: boolean }> {
    return apiRequest<{ is_2fa_enabled: boolean }>('/auth/2fa/status');
  },
};
