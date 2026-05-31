import { BaseTeacherAdapter } from './base-adapter';
import type {
  TeacherAdapterContext,
  TeacherGenerationJobPayload,
  TeacherQuizGenerationInput,
} from './types';
import type { GenerateClassroomInput } from '@/lib/server/classroom-generation';

export class QuizAdapter extends BaseTeacherAdapter<
  TeacherQuizGenerationInput,
  GenerateClassroomInput,
  TeacherGenerationJobPayload,
  TeacherGenerationJobPayload
> {
  readonly feature = 'quizGeneration' as const;

  constructor(context: TeacherAdapterContext) {
    super(context);
  }

  transform(input: TeacherQuizGenerationInput): GenerateClassroomInput {
    const requirement = [
      '请为教师课堂生成 Quiz 测验内容，场景类型以 quiz 为主。',
      `教案 ID：${input.lessonId}`,
      input.topic ? `测验主题：${input.topic}` : undefined,
      input.questionCount ? `题目数量：${input.questionCount}` : undefined,
      input.difficulty ? `难度：${input.difficulty}` : undefined,
    ]
      .filter(Boolean)
      .join('\n');

    return {
      requirement,
      enableImageGeneration: false,
      enableVideoGeneration: false,
      enableTTS: false,
      agentMode: 'default',
    };
  }

  parse(output: TeacherGenerationJobPayload): TeacherGenerationJobPayload {
    return output;
  }

  async execute(input: TeacherQuizGenerationInput): Promise<TeacherGenerationJobPayload> {
    this.ensureEnabled();
    return this.parse({
      classroomInput: this.transform(input),
      metadata: { lessonId: input.lessonId },
    });
  }
}
