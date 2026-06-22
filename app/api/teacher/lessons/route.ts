import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import {
  createTeacherLesson,
  isValidLessonDuration,
  listTeacherLessons,
  MIN_LESSON_DURATION,
} from '@/lib/teacher/lesson-service';
import type { CreateLessonInput } from '@/lib/teacher/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const page = Number(searchParams.get('page') || 1);
  const limit = Number(searchParams.get('limit') || 50);

  const result = await listTeacherLessons({
    page,
    limit,
    subject: searchParams.get('subject') || undefined,
    grade: searchParams.get('grade') || undefined,
  });

  return apiSuccess(result);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<CreateLessonInput>;
    if (!body.subject || !body.grade || !body.topic) {
      return apiError(
        'MISSING_REQUIRED_FIELD',
        400,
        'Missing required fields: subject, grade, topic',
      );
    }
    if (body.duration !== undefined && !isValidLessonDuration(body.duration)) {
      return apiError(
        'INVALID_REQUEST',
        400,
        `Lesson duration must be an integer of at least ${MIN_LESSON_DURATION} minutes`,
      );
    }

    const lesson = await createTeacherLesson({
      subject: body.subject,
      grade: body.grade,
      topic: body.topic,
      objectives: body.objectives,
      duration: body.duration,
      style: body.style,
      additionalRequirements: body.additionalRequirements,
    });

    return apiSuccess({ lesson, lessonId: lesson.id }, 201);
  } catch (error) {
    return apiError(
      'INVALID_REQUEST',
      400,
      'Failed to create teacher lesson',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}
