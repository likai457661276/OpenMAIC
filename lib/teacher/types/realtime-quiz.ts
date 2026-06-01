export type QuizSessionStatus = 'waiting' | 'active' | 'paused' | 'completed';

export interface QuizSession {
  id: string;
  quizSetId: string;
  sessionCode: string;
  teacherId: string;
  status: QuizSessionStatus;
  currentQuestionIndex: number;
  participants: Participant[];
  startedAt?: string;
  endedAt?: string;
  settings: SessionSettings;
  createdAt: string;
  updatedAt: string;
}

export interface Participant {
  id: string;
  name: string;
  joinedAt: string;
  answers: ParticipantAnswer[];
  totalScore: number;
}

export interface ParticipantAnswer {
  questionId: string;
  answer: string | string[];
  isCorrect: boolean;
  score: number;
  answeredAt: string;
  timeTaken: number;
}

export interface SessionSettings {
  showResultsImmediately: boolean;
  allowLateJoin: boolean;
  questionTimeLimit?: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
}

export interface CreateQuizSessionInput {
  quizSetId: string;
  teacherId?: string;
  settings?: Partial<SessionSettings>;
}
