import { apiRequest } from './api';
import { Exam, QuestionAdmin } from '../types';

export const examService = {
  async listExams(): Promise<Exam[]> {
    return apiRequest<Exam[]>('/exams');
  },

  async getExam(id: number): Promise<Exam> {
    return apiRequest<Exam>(`/exams/${id}`);
  },

  async createExam(data: Partial<Exam> & { question_ids?: number[] }): Promise<Exam> {
    return apiRequest<Exam>('/exams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateExam(id: number, data: Partial<Exam> & { question_ids?: number[] }): Promise<Exam> {
    return apiRequest<Exam>(`/exams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteExam(id: number): Promise<void> {
    return apiRequest<void>(`/exams/${id}`, {
      method: 'DELETE',
    });
  },

  async getExamQuestionsAdmin(id: number): Promise<QuestionAdmin[]> {
    return apiRequest<QuestionAdmin[]>(`/exams/${id}/questions`);
  },
};
