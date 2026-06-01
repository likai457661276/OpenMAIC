import { type NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { apiError } from '@/lib/server/api-response';
import { getFeatureFlags } from '@/lib/feature-flags';
import { ExportAdapter, type TeacherExportInput } from '@/lib/teacher/adapters';
import { exportTeacherSlides } from '@/lib/teacher/export-service';

function contentDisposition(fileName: string): string {
  const fallback = fileName.replace(/[^\x20-\x7e]/g, '_').replaceAll('"', "'");
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<TeacherExportInput>;
    if (!body.lessonId || !body.format) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Missing required fields: lessonId, format');
    }

    const adapter = new ExportAdapter({ featureFlags: getFeatureFlags() });
    const result = await adapter.execute({
      lessonId: body.lessonId,
      format: body.format,
      slideIds: body.slideIds,
      fileName: body.fileName,
    });

    if (!result.supported) {
      return apiError('INVALID_REQUEST', 400, result.message);
    }

    const file = await exportTeacherSlides({
      lessonId: body.lessonId,
      format: body.format,
      slideIds: body.slideIds,
      fileName: body.fileName,
    });

    return new NextResponse(new Uint8Array(file.buffer), {
      headers: {
        'Content-Type': file.mimeType,
        'Content-Disposition': contentDisposition(file.fileName),
        'Content-Length': String(file.buffer.byteLength),
        'X-Teacher-Export-Slide-Count': String(file.slideCount),
      },
    });
  } catch (error) {
    return apiError(
      'INVALID_REQUEST',
      400,
      'Failed to execute teacher export adapter',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}
