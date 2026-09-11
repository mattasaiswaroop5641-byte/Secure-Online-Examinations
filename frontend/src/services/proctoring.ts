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
};

