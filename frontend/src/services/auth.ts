import { apiRequest } from './api';
import { User, AuthResponse } from '../types';

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
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
};
