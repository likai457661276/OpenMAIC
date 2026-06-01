import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createQuizSession } from '@/lib/teacher/realtime-service';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Parameters<typeof createQuizSession>[0];
    if (!body.quizSetId) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Missing required field: quizSetId');
    }
    const session = await createQuizSession(body);
    return apiSuccess({ session }, 201);
  } catch (error) {
    return apiError(
      'INVALID_REQUEST',
      400,
      'Failed to create quiz session',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}
