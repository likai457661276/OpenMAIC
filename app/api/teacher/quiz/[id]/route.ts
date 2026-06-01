import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { deleteQuizSet, getQuizSet, updateQuizSet } from '@/lib/teacher/quiz-service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const quizSet = await getQuizSet(id);
  if (!quizSet) return apiError('INVALID_REQUEST', 404, 'Quiz not found');
  return apiSuccess({ quizSet });
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const quizSet = await updateQuizSet(id, await req.json());
    if (!quizSet) return apiError('INVALID_REQUEST', 404, 'Quiz not found');
    return apiSuccess({ quizSet });
  } catch (error) {
    return apiError(
      'INVALID_REQUEST',
      400,
      'Failed to update quiz',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const deleted = await deleteQuizSet(id);
  return apiSuccess({ deleted });
}
