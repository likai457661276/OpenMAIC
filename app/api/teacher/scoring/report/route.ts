import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { buildSessionReport } from '@/lib/teacher/scoring-service';

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('sessionId');
    if (!sessionId) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Missing required field: sessionId');
    }
    const report = await buildSessionReport(sessionId);
    return apiSuccess({ report });
  } catch (error) {
    return apiError(
      'INVALID_REQUEST',
      400,
      'Failed to build scoring report',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}
