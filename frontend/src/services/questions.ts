import { apiRequest } from './api';
import { QuestionAdmin } from '../types';

export const questionService = {
  async listQuestions(params?: {
    subject?: string;
    difficulty?: string;
    search?: string;
  }): Promise<QuestionAdmin[]> {
    const query = new URLSearchParams();
    if (params?.subject) query.append('subject', params.subject);
    if (params?.difficulty) query.append('difficulty', params.difficulty);
    if (params?.search) query.append('search', params.search);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiRequest<QuestionAdmin[]>(`/questions${queryString}`);
  },

  async getSubjects(): Promise<string[]> {
    return apiRequest<string[]>('/questions/subjects');
  },

  async getQuestion(id: number): Promise<QuestionAdmin> {
    return apiRequest<QuestionAdmin>(`/questions/${id}`);
  },

  async createQuestion(data: {
    subject: string;
    text: string;
    question_type?: string;
    difficulty?: string;
    marks?: number;
    negative_marks?: number;
    explanation?: string;
    options: { option_text: string; is_correct: boolean }[];
  }): Promise<QuestionAdmin> {
    return apiRequest<QuestionAdmin>('/questions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateQuestion(
    id: number,
    data: {
      subject?: string;
      text?: string;
      difficulty?: string;
      marks?: number;
      negative_marks?: number;
      explanation?: string;
      options?: { option_text: string; is_correct: boolean }[];
    }
  ): Promise<QuestionAdmin> {
    return apiRequest<QuestionAdmin>(`/questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteQuestion(id: number): Promise<void> {
    return apiRequest<void>(`/questions/${id}`, {
      method: 'DELETE',
    });
  },
};
