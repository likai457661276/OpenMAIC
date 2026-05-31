export interface TeacherQuizSummary {
  id: string;
  title: string;
  questionCount: number;
}

export async function listLessonQuizzes(lessonId: string): Promise<TeacherQuizSummary[]> {
  void lessonId;
  return [];
}
