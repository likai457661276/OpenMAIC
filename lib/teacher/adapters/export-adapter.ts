import { BaseTeacherAdapter } from './base-adapter';
import type { TeacherAdapterContext, TeacherExportInput, TeacherExportResult } from './types';

export class ExportAdapter extends BaseTeacherAdapter<
  TeacherExportInput,
  TeacherExportInput,
  TeacherExportResult,
  TeacherExportResult
> {
  readonly feature = 'pptxExport' as const;

  constructor(context: TeacherAdapterContext) {
    super(context);
  }

  transform(input: TeacherExportInput): TeacherExportInput {
    return input;
  }

  parse(output: TeacherExportResult): TeacherExportResult {
    return output;
  }

  async execute(input: TeacherExportInput): Promise<TeacherExportResult> {
    this.ensureEnabled();
    return this.parse({
      format: input.format,
      supported: input.format === 'pptx' || input.format === 'resource-pack',
      message: '教师导出适配器已接入，实际文件导出将在课件预览功能中调用现有导出 Hook。',
    });
  }
}
