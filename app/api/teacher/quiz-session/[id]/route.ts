import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import {
  getQuizSession,
  moveToQuestion,
  updateQuizSessionStatus,
} from '@/lib/teacher/realtime-service';
import type { QuizSessionStatus } from '@/lib/teacher/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const session = await getQuizSession(id);
  if (!session) return apiError('INVALID_REQUEST', 404, 'Quiz session not found');
  return apiSuccess({ session });
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = (await req.json()) as {
      status?: QuizSessionStatus;
      currentQuestionIndex?: number;
    };
    let session = body.status
      ? await updateQuizSessionStatus(id, body.status)
      : await getQuizSession(id);
    if (typeof body.currentQuestionIndex === 'number') {
      session = await moveToQuestion(id, body.currentQuestionIndex);
    }
    if (!session) return apiError('INVALID_REQUEST', 404, 'Quiz session not found');
    return apiSuccess({ session });
  } catch (error) {
    return apiError(
      'INVALID_REQUEST',
      400,
      'Failed to update quiz session',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}
