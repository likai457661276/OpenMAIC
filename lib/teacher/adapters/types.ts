import type { GenerateClassroomInput } from '@/lib/server/classroom-generation';
import type { FeatureFlags } from '@/lib/feature-flags';

export interface TeacherAdapterContext {
  featureFlags: FeatureFlags;
}

export interface TeacherGenerationJobPayload {
  classroomInput: GenerateClassroomInput;
  metadata: Record<string, unknown>;
}

export interface TeacherLessonGenerationInput {
  subject: string;
  grade: string;
  topic: string;
  objectives?: string[];
  duration?: number;
  style?: string;
  additionalRequirements?: string;
  enableWebSearch?: boolean;
  enableImageGeneration?: boolean;
  enableVideoGeneration?: boolean;
}

export interface TeacherSlideGenerationInput {
  lessonId: string;
  lessonTitle?: string;
  topic?: string;
  slideCount?: number;
  style?: string;
  includeTypes?: string[];
}

export interface TeacherQuizGenerationInput {
  lessonId: string;
  topic?: string;
  questionCount?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface TeacherPBLGenerationInput {
  lessonId: string;
  topic?: string;
  issueCount?: number;
  targetSkills?: string[];
}

export interface TeacherExportInput {
  lessonId: string;
  format: 'pptx' | 'resource-pack';
}

export interface TeacherExportResult {
  format: TeacherExportInput['format'];
  supported: boolean;
  message: string;
}
