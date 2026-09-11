import { apiRequest } from './api';
import { StartExamResponse, AttemptResult } from '../types';

export const attemptService = {
  async startExam(examId: number): Promise<StartExamResponse> {
    return apiRequest<StartExamResponse>(`/attempts/exams/${examId}/start`, {
      method: 'POST',
    });
  },

  async getTimeRemaining(attemptId: number): Promise<{
    attempt_id: number;
    remaining_seconds: number;
    is_expired: boolean;
    status: string;
  }> {
    return apiRequest(`/attempts/${attemptId}/time-remaining`);
  },

  async saveAnswer(
    attemptId: number,
    data: {
      question_id: number;
      selected_option_id: number | null;
      is_marked_for_review?: boolean;
    }
  ): Promise<{ status: string; question_id: number; selected_option_id: number | null }> {
    return apiRequest(`/attempts/${attemptId}/answer`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async submitExam(attemptId: number): Promise<AttemptResult> {
    return apiRequest<AttemptResult>(`/attempts/${attemptId}/submit`, {
      method: 'POST',
    });
  },

  async getResult(attemptId: number): Promise<AttemptResult> {
    return apiRequest<AttemptResult>(`/attempts/${attemptId}/result`);
  },

  async listAttemptsAdmin(params?: {
    exam_id?: number;
    student_id?: number;
  }): Promise<any[]> {
    const query = new URLSearchParams();
    if (params?.exam_id) query.append('exam_id', params.exam_id.toString());
    if (params?.student_id) query.append('student_id', params.student_id.toString());

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiRequest<any[]>(`/attempts${queryString}`);
  },
};
