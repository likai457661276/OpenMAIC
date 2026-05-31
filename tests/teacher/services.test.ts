import { describe, expect, it } from 'vitest';
import {
  createTeacherLesson,
  deleteTeacherLesson,
  getTeacherLesson,
  updateTeacherLesson,
} from '@/lib/teacher/lesson-service';
import {
  createSlideSetFromLesson,
  getLessonSlideSet,
  updateLessonSlideSet,
} from '@/lib/teacher/slide-service';

describe('teacher services', () => {
  it('persists and updates a structured lesson plan', async () => {
    const lesson = await createTeacherLesson({
      subject: '数学',
      grade: '高中一年级',
      topic: '函数单调性',
      objectives: ['理解单调性定义'],
      duration: 45,
      style: '探究式',
    });

    expect(lesson.id).toBeTruthy();
    expect(lesson.objectives).toContain('理解单调性定义');

    const updated = await updateTeacherLesson(lesson.id, {
      keyPoints: ['单调区间判断'],
    });
    expect(updated?.status).toBe('edited');
    expect(updated?.keyPoints).toEqual(['单调区间判断']);

    const loaded = await getTeacherLesson(lesson.id);
    expect(loaded?.title).toBe('函数单调性');

    await deleteTeacherLesson(lesson.id);
  });

  it('creates editable slide sets from lesson plans', async () => {
    const lesson = await createTeacherLesson({
      subject: '物理',
      grade: '初中二年级',
      topic: '牛顿第二定律',
      duration: 40,
    });

    const slideSet = await createSlideSetFromLesson(lesson, {
      slideCount: 4,
      style: 'academic',
    });

    expect(slideSet.slides).toHaveLength(4);
    expect(slideSet.slides[0].content.elements.length).toBeGreaterThan(0);

    const next = await updateLessonSlideSet(lesson.id, {
      slides: slideSet.slides.slice().reverse(),
    });
    expect(next?.slides[0].order).toBe(1);

    const loaded = await getLessonSlideSet(lesson.id);
    expect(loaded?.lessonId).toBe(lesson.id);

    await deleteTeacherLesson(lesson.id);
  });
});
