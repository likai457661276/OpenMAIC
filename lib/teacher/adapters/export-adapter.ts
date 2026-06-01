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
    const supported = input.format === 'pptx';
    return this.parse({
      format: input.format,
      supported,
      fileName: input.fileName,
      slideCount: input.slideIds?.length,
      message: supported
        ? '教师 PPTX 导出适配器已接入原有 pptxgenjs 能力。'
        : '当前教师模式仅支持 PPTX 导出，PDF 作为后续格式预留。',
    });
  }
}
