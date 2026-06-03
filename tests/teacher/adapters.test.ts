import { describe, expect, it } from 'vitest';
import { DEFAULT_TEACHER_MODE_FLAGS } from '@/lib/feature-flags';
import { QuizAdapter } from '@/lib/teacher/adapters';

describe('teacher adapters', () => {
  it('keeps quiz generation focused on quiz content', () => {
    const adapter = new QuizAdapter({ featureFlags: DEFAULT_TEACHER_MODE_FLAGS });

    const input = adapter.transform({
      lessonId: 'lesson-1',
      topic: '牛顿第二定律',
      questionCount: 5,
      difficulty: 'medium',
    });

    expect(input.requirement).toContain('quiz');
    expect(input.requirement).toContain('牛顿第二定律');
    expect(input.enableImageGeneration).toBe(false);
    expect(input.enableTTS).toBe(false);
  });
});
