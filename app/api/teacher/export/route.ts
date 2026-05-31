import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getFeatureFlags } from '@/lib/feature-flags';
import { ExportAdapter, type TeacherExportInput } from '@/lib/teacher/adapters';

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
    });

    return apiSuccess({ result });
  } catch (error) {
    return apiError(
      'INVALID_REQUEST',
      400,
      'Failed to execute teacher export adapter',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}
