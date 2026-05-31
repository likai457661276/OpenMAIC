import { BaseTeacherAdapter } from './base-adapter';
import type {
  TeacherAdapterContext,
  TeacherGenerationJobPayload,
  TeacherPBLGenerationInput,
} from './types';
import type { GenerateClassroomInput } from '@/lib/server/classroom-generation';

export class PBLAdapter extends BaseTeacherAdapter<
  TeacherPBLGenerationInput,
  GenerateClassroomInput,
  TeacherGenerationJobPayload,
  TeacherGenerationJobPayload
> {
  readonly feature = 'pblGeneration' as const;

  constructor(context: TeacherAdapterContext) {
    super(context);
  }

  transform(input: TeacherPBLGenerationInput): GenerateClassroomInput {
    const requirement = [
      '请为教师课堂生成 PBL 项目式学习内容，场景类型以 pbl 为主。',
      `教案 ID：${input.lessonId}`,
      input.topic ? `项目主题：${input.topic}` : undefined,
      input.issueCount ? `任务数量：${input.issueCount}` : undefined,
      input.targetSkills?.length ? `目标能力：${input.targetSkills.join('、')}` : undefined,
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

  async execute(input: TeacherPBLGenerationInput): Promise<TeacherGenerationJobPayload> {
    this.ensureEnabled();
    return this.parse({
      classroomInput: this.transform(input),
      metadata: { lessonId: input.lessonId },
    });
  }
}
