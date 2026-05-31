export type LessonStatus = 'draft' | 'generating' | 'ready';

export interface TeacherLesson {
  id: string;
  title: string;
  subject: string;
  gradeLevel: string;
  updatedAt: string;
  status: LessonStatus;
}

export interface LessonDraftInput {
  title: string;
  subject: string;
  gradeLevel: string;
  objectives?: string;
}

export async function listTeacherLessons(): Promise<TeacherLesson[]> {
  return [];
}

export async function getTeacherLesson(id: string): Promise<TeacherLesson | null> {
  void id;
  return null;
}

export async function createLessonDraft(input: LessonDraftInput): Promise<TeacherLesson> {
  return {
    id: crypto.randomUUID(),
    title: input.title,
    subject: input.subject,
    gradeLevel: input.gradeLevel,
    updatedAt: new Date().toISOString(),
    status: 'draft',
  };
}
