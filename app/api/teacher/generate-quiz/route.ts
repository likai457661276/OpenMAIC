import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getFeatureFlags } from '@/lib/feature-flags';
import { QuizAdapter, type TeacherQuizGenerationInput } from '@/lib/teacher/adapters';
import { createQuizSetFromLesson } from '@/lib/teacher/quiz-service';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<TeacherQuizGenerationInput>;
    if (!body.lessonId) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Missing required field: lessonId');
    }

    const adapter = new QuizAdapter({ featureFlags: getFeatureFlags() });
    adapter.ensureAvailable();
    const quizSet = await createQuizSetFromLesson({
      lessonId: body.lessonId,
      title: body.topic,
      questionCount: body.questionCount,
      questionTypes: body.questionTypes,
      difficulty: body.difficulty,
    });

    return apiSuccess({ quizSet });
  } catch (error) {
    return apiError(
      'INVALID_REQUEST',
      400,
      'Failed to generate teacher quiz',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}
