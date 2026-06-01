import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createQuizSetFromLesson, listLessonQuizzes } from '@/lib/teacher/quiz-service';

export async function GET(req: NextRequest) {
  const lessonId = req.nextUrl.searchParams.get('lessonId');
  if (!lessonId) {
    return apiError('MISSING_REQUIRED_FIELD', 400, 'Missing required field: lessonId');
  }
  const quizzes = await listLessonQuizzes(lessonId);
  return apiSuccess({ quizzes });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Parameters<typeof createQuizSetFromLesson>[0];
    if (!body.lessonId) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Missing required field: lessonId');
    }
    const quizSet = await createQuizSetFromLesson(body);
    return apiSuccess({ quizSet }, 201);
  } catch (error) {
    return apiError(
      'INVALID_REQUEST',
      400,
      'Failed to create quiz',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}
