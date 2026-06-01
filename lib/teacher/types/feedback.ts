export type FeedbackType =
  | 'quick-poll'
  | 'understanding'
  | 'emoji-reaction'
  | 'free-text'
  | 'rating';

export type FeedbackStatus = 'active' | 'closed';

export interface FeedbackSession {
  id: string;
  lessonId: string;
  type: FeedbackType;
  question: string;
  responses: FeedbackResponse[];
  createdAt: string;
  closedAt?: string;
  status: FeedbackStatus;
}

export interface FeedbackResponse {
  participantId: string;
  participantName: string;
  value: string | number;
  submittedAt: string;
}

export interface FeedbackSummary {
  sessionId: string;
  totalResponses: number;
  distribution: Record<string, number>;
  averageRating?: number;
  textResponses?: string[];
}

export interface ClassroomFeedbackReport {
  lessonId: string;
  feedbackSessions: FeedbackSession[];
  overallUnderstanding: number;
  participationRate: number;
  keyInsights: string[];
}

export interface CreateFeedbackInput {
  lessonId: string;
  type: FeedbackType;
  question: string;
}
