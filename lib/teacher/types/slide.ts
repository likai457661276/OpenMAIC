import type { Slide } from '@/lib/types/slides';
import type { LessonPlan } from './lesson';

export type TeacherSlideStyle = 'professional' | 'casual' | 'academic' | 'colorful';

export type TeacherSlideType =
  | 'title'
  | 'content'
  | 'image-text'
  | 'bullets'
  | 'code'
  | 'formula'
  | 'comparison'
  | 'table'
  | 'interactive'
  | 'summary';

export interface SlideGenerationInput {
  lessonId: string;
  lessonPlan?: LessonPlan;
  slideCount?: number;
  style?: TeacherSlideStyle;
  includeTypes?: TeacherSlideType[];
}

export interface TeacherSlide {
  id: string;
  order: number;
  type: TeacherSlideType;
  title: string;
  content: Slide;
  notes?: string;
  duration?: number;
}

export interface TeacherSlideSet {
  id: string;
  lessonId: string;
  slides: TeacherSlide[];
  totalDuration: number;
  createdAt: string;
  updatedAt: string;
  sourceJobId?: string;
  sourceClassroomId?: string;
  style?: TeacherSlideStyle;
}

export interface UpdateSlideSetInput {
  slides: TeacherSlide[];
  style?: TeacherSlideStyle;
  sourceJobId?: string;
  sourceClassroomId?: string;
}
