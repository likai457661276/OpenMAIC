import { BaseTeacherAdapter } from './base-adapter';
import type {
  TeacherGenerationJobPayload,
  TeacherLessonGenerationInput,
  TeacherAdapterContext,
} from './types';
import type { GenerateClassroomInput } from '@/lib/server/classroom-generation';

export class LessonAdapter extends BaseTeacherAdapter<
  TeacherLessonGenerationInput,
  GenerateClassroomInput,
  TeacherGenerationJobPayload,
  TeacherGenerationJobPayload
> {
  readonly feature = 'lessonGeneration' as const;

  constructor(context: TeacherAdapterContext) {
    super(context);
  }

  transform(input: TeacherLessonGenerationInput): GenerateClassroomInput {
    const objectives = input.objectives?.filter(Boolean).join('、') || '自动补全教学目标';
    const requirement = [
      `请为${input.grade}${input.subject}课程生成一套教师备课内容。`,
      `课题：${input.topic}`,
      `教学目标：${objectives}`,
      input.duration ? `课时：${input.duration}分钟` : undefined,
      input.style ? `教学风格：${input.style}` : undefined,
      '输出应适合教师备课使用，并包含可进一步生成课件、测验和课堂活动的结构。',
    ]
      .filter(Boolean)
      .join('\n');

    return {
      requirement,
      enableWebSearch: input.enableWebSearch,
      enableImageGeneration: input.enableImageGeneration,
      enableVideoGeneration: input.enableVideoGeneration,
      enableTTS: false,
      agentMode: 'default',
    };
  }

  parse(output: TeacherGenerationJobPayload): TeacherGenerationJobPayload {
    return output;
  }

  async execute(input: TeacherLessonGenerationInput): Promise<TeacherGenerationJobPayload> {
    this.ensureEnabled();
    return this.parse({
      classroomInput: this.transform(input),
      metadata: {
        subject: input.subject,
        grade: input.grade,
        topic: input.topic,
      },
    });
  }
}
