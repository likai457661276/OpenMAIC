export interface TeacherPBLProjectSummary {
  id: string;
  title: string;
  taskCount: number;
}

export async function listLessonPBLProjects(lessonId: string): Promise<TeacherPBLProjectSummary[]> {
  void lessonId;
  return [];
}
