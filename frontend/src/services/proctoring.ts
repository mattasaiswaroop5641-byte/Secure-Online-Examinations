import { apiRequest } from './api';
import { ProctoringEvent, ProctoringSummary, ProctoringEventType, ViolationSeverity } from '../types';

export const proctoringService = {
  async logEvent(data: {
    attempt_id: number;
    event_type: ProctoringEventType;
    severity: ViolationSeverity;
    duration_seconds?: number;
    description?: string;
    screenshot_base64?: string;
    timestamp?: string;
  }): Promise<ProctoringEvent> {
    return apiRequest<ProctoringEvent>('/proctoring/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },


  async getSummary(attemptId: number): Promise<ProctoringSummary> {
    return apiRequest<ProctoringSummary>(`/proctoring/${attemptId}`);
  },

  async verifyFrame(imageBase64: string): Promise<{
    face_count: number;
    status: string;
    confidence: number;
    message: string;
    is_centered?: boolean;
    looking_direction?: 'CENTER' | 'LEFT' | 'RIGHT' | 'DOWN' | 'UP';
    bounding_boxes?: { x: number; y: number; width: number; height: number }[];
  }> {
    return apiRequest('/proctoring/verify-frame', {
      method: 'POST',
      body: JSON.stringify({ image_base64: imageBase64 }),
    });
  },

  async resolveEvent(eventId: number): Promise<{ status: string; event_id: number }> {
    return apiRequest(`/proctoring/events/${eventId}/resolve`, {
      method: 'PUT',
    });
  },

  async deleteEvent(eventId: number): Promise<{ status: string; event_id: number }> {
    return apiRequest(`/proctoring/events/${eventId}`, {
      method: 'DELETE',
    });
  },

  async clearEvents(attemptId?: number): Promise<{ status: string; deleted_count: number }> {
    const url = attemptId ? `/proctoring/events?attempt_id=${attemptId}` : '/proctoring/events';
    return apiRequest(url, {
      method: 'DELETE',
    });
  },

  async pushLiveFeed(attemptId: number, data: {
    image_base64: string;
    trust_score?: number;
    violation_count?: number;
    looking_direction?: string;
    face_count?: number;
  }): Promise<{ status: string; timestamp: string }> {
    return apiRequest<{ status: string; timestamp: string }>(`/proctoring/live-feed/${attemptId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getLiveFeed(attemptId: number): Promise<{
    attempt_id: number;
    student_id: number;
    student_name: string;
    student_email: string;
    student_code: string;
    exam_title: string;
    attempt_status: string;
    is_live: boolean;
    seconds_since_last_frame: number | null;
    image_base64: string | null;
    trust_score: number;
    violation_count: number;
    looking_direction: string;
    face_count: number;
    start_time: string;
    current_time: string;
  }> {
    return apiRequest(`/proctoring/live-feed/${attemptId}`);
  },

  async listActiveCandidates(): Promise<{
    attempt_id: number;
    student_id: number;
    student_name: string;
    student_email: string;
    student_code: string;
    exam_id: number;
    exam_title: string;
    is_live: boolean;
    seconds_since_last_frame: number | null;
    has_preview: boolean;
    trust_score: number;
    violation_count: number;
    start_time: string;
  }[]> {
    return apiRequest('/proctoring/live-active-candidates');
  },
};

