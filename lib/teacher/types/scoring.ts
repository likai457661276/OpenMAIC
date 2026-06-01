import type { QuestionType } from './quiz';

export interface ScoringResult {
  sessionId: string;
  participantId: string;
  participantName: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
  questionResults: QuestionResult[];
  gradedAt: string;
}

export interface QuestionResult {
  questionId: string;
  questionType: QuestionType;
  score: number;
  maxScore: number;
  isCorrect: boolean;
  submittedAnswer: string | string[];
  correctAnswer: string | string[];
  feedback?: string;
  gradingType: 'auto' | 'ai-assisted' | 'manual';
}

export interface SessionReport {
  sessionId: string;
  quizTitle: string;
  participantCount: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  scoreDistribution: ScoreRange[];
  questionAnalysis: QuestionAnalysis[];
  results: ScoringResult[];
}

export interface ScoreRange {
  label: string;
  min: number;
  max: number;
  count: number;
}

export interface QuestionAnalysis {
  questionId: string;
  content: string;
  correctRate: number;
  averageTime: number;
  commonWrongAnswers: string[];
}
