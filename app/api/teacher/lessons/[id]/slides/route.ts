import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getTeacherLesson, isValidTeacherResourceId } from '@/lib/teacher/lesson-service';
import {
  createSlideSetFromLesson,
  getLessonSlideSet,
  updateLessonSlideSet,
} from '@/lib/teacher/slide-service';
import type { UpdateSlideSetInput } from '@/lib/teacher/types';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!isValidTeacherResourceId(id)) {
    return apiError('INVALID_REQUEST', 400, 'Invalid teacher lesson id');
  }

  const lesson = await getTeacherLesson(id);
  if (!lesson) {
    return apiError('INVALID_REQUEST', 404, 'Teacher lesson not found');
  }

  const existing = await getLessonSlideSet(id);
  const slideSet = existing ?? (await createSlideSetFromLesson(lesson));
  return apiSuccess({ slideSet });
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!isValidTeacherResourceId(id)) {
      return apiError('INVALID_REQUEST', 400, 'Invalid teacher lesson id');
    }

    const body = (await req.json()) as UpdateSlideSetInput;
    if (!Array.isArray(body.slides)) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Missing required field: slides');
    }

    const slideSet = await updateLessonSlideSet(id, body);
    if (!slideSet) {
      return apiError('INVALID_REQUEST', 404, 'Teacher slide set not found');
    }

    return apiSuccess({ slideSet });
  } catch (error) {
    return apiError(
      'INVALID_REQUEST',
      400,
      'Failed to update teacher slides',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}
