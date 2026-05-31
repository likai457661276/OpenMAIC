import { BaseTeacherAdapter } from './base-adapter';
import type {
  TeacherAdapterContext,
  TeacherGenerationJobPayload,
  TeacherSlideGenerationInput,
} from './types';
import type { GenerateClassroomInput } from '@/lib/server/classroom-generation';

export class SlideAdapter extends BaseTeacherAdapter<
  TeacherSlideGenerationInput,
  GenerateClassroomInput,
  TeacherGenerationJobPayload,
  TeacherGenerationJobPayload
> {
  readonly feature = 'slideGeneration' as const;

  constructor(context: TeacherAdapterContext) {
    super(context);
  }

  transform(input: TeacherSlideGenerationInput): GenerateClassroomInput {
    const requirement = [
      '请基于教师教案生成课件内容，场景类型以 slide 为主。',
      `教案 ID：${input.lessonId}`,
      input.lessonTitle ? `教案标题：${input.lessonTitle}` : undefined,
      input.topic ? `课题：${input.topic}` : undefined,
      input.slideCount ? `幻灯片数量：约 ${input.slideCount} 页` : undefined,
      input.style ? `课件风格：${input.style}` : undefined,
    ]
      .filter(Boolean)
      .join('\n');

    return {
      requirement,
      enableImageGeneration: true,
      enableVideoGeneration: false,
      enableTTS: false,
      agentMode: 'default',
    };
  }

  parse(output: TeacherGenerationJobPayload): TeacherGenerationJobPayload {
    return output;
  }

  async execute(input: TeacherSlideGenerationInput): Promise<TeacherGenerationJobPayload> {
    this.ensureEnabled();
    return this.parse({
      classroomInput: this.transform(input),
      metadata: { lessonId: input.lessonId },
    });
  }
}
