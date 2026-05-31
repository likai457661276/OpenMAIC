export interface TeacherSlideSummary {
  id: string;
  title: string;
  order: number;
}

export async function listLessonSlides(lessonId: string): Promise<TeacherSlideSummary[]> {
  void lessonId;
  return [];
}
