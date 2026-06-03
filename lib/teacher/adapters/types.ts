import type { GenerateClassroomInput } from '@/lib/server/classroom-generation';
import type { FeatureFlags } from '@/lib/feature-flags';
import type { QuestionType } from '@/lib/teacher/types';

export interface TeacherAdapterContext {
  featureFlags: FeatureFlags;
}

export interface TeacherGenerationJobPayload {
  classroomInput: GenerateClassroomInput;
  metadata: Record<string, unknown>;
}

export interface TeacherQuizGenerationInput {
  lessonId: string;
  topic?: string;
  questionCount?: number;
  questionTypes?: QuestionType[];
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
}

export interface TeacherPBLGenerationInput {
  lessonId: string;
  topic?: string;
  issueCount?: number;
  targetSkills?: string[];
}

export interface TeacherExportInput {
  lessonId: string;
  format: 'pptx' | 'pdf';
  slideIds?: string[];
  fileName?: string;
}

export interface TeacherExportResult {
  format: TeacherExportInput['format'];
  supported: boolean;
  message: string;
  fileName?: string;
  slideCount?: number;
}
