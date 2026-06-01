import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { submitQuizAnswer } from '@/lib/teacher/realtime-service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = (await req.json()) as {
      participantId?: string;
      questionId?: string;
      answer?: string | string[];
      timeTaken?: number;
    };
    if (!body.participantId || !body.questionId || body.answer === undefined) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Missing required answer fields');
    }
    const result = await submitQuizAnswer({
      sessionId: id,
      participantId: body.participantId,
      questionId: body.questionId,
      answer: body.answer,
      timeTaken: body.timeTaken,
    });
    return apiSuccess(result);
  } catch (error) {
    return apiError(
      'INVALID_REQUEST',
      400,
      'Failed to submit answer',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}
