import type { LessonPlan } from './lesson';

export type QuestionType =
  | 'single-choice'
  | 'multiple-choice'
  | 'true-false'
  | 'fill-blank'
  | 'short-answer';

export type QuizDifficulty = 'easy' | 'medium' | 'hard';
export type QuizStatus = 'draft' | 'ready' | 'active' | 'completed';

export interface QuizOption {
  id: string;
  label: string;
  content: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  id: string;
  order: number;
  type: QuestionType;
  content: string;
  options?: QuizOption[];
  correctAnswer: string | string[];
  explanation: string;
  score: number;
  difficulty: QuizDifficulty;
  knowledgePoint?: string;
}

export interface QuizSet {
  id: string;
  lessonId: string;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  totalScore: number;
  timeLimit?: number;
  createdAt: string;
  updatedAt: string;
  status: QuizStatus;
}

export interface QuizGenerationInput {
  lessonId: string;
  lessonPlan?: LessonPlan;
  questionCount?: number;
  questionTypes?: QuestionType[];
  difficulty?: QuizDifficulty | 'mixed';
  title?: string;
}

export type QuizSetUpdateInput = Partial<
  Pick<QuizSet, 'title' | 'description' | 'questions' | 'timeLimit' | 'status'>
>;
