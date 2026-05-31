import { describe, expect, it } from 'vitest';
import { DEFAULT_TEACHER_MODE_FLAGS } from '@/lib/feature-flags';
import { LessonAdapter, QuizAdapter, SlideAdapter } from '@/lib/teacher/adapters';

describe('teacher adapters', () => {
  it('transforms lesson input into the existing classroom generation contract', () => {
    const adapter = new LessonAdapter({ featureFlags: DEFAULT_TEACHER_MODE_FLAGS });

    const input = adapter.transform({
      subject: '数学',
      grade: '高一',
      topic: '函数单调性',
      objectives: ['理解单调性定义', '会判断简单函数单调区间'],
      duration: 45,
      style: '探究式',
    });

    expect(input.requirement).toContain('高一数学');
    expect(input.requirement).toContain('函数单调性');
    expect(input.requirement).toContain('理解单调性定义');
    expect(input.enableTTS).toBe(false);
    expect(input.agentMode).toBe('default');
  });

  it('blocks disabled adapter features before execution', async () => {
    const adapter = new SlideAdapter({
      featureFlags: {
        ...DEFAULT_TEACHER_MODE_FLAGS,
        slideGeneration: false,
      },
    });

    await expect(adapter.execute({ lessonId: 'lesson-1' })).rejects.toThrow(
      'Feature "slideGeneration" is disabled.',
    );
  });

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
