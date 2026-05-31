import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import {
  deleteTeacherLesson,
  getTeacherLesson,
  isValidTeacherResourceId,
  updateTeacherLesson,
} from '@/lib/teacher/lesson-service';
import type { UpdateLessonInput } from '@/lib/teacher/types';

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

  return apiSuccess({ lesson });
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!isValidTeacherResourceId(id)) {
      return apiError('INVALID_REQUEST', 400, 'Invalid teacher lesson id');
    }

    const body = (await req.json()) as UpdateLessonInput;
    const lesson = await updateTeacherLesson(id, body);
    if (!lesson) {
      return apiError('INVALID_REQUEST', 404, 'Teacher lesson not found');
    }

    return apiSuccess({ lesson });
  } catch (error) {
    return apiError(
      'INVALID_REQUEST',
      400,
      'Failed to update teacher lesson',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!isValidTeacherResourceId(id)) {
    return apiError('INVALID_REQUEST', 400, 'Invalid teacher lesson id');
  }

  const deleted = await deleteTeacherLesson(id);
  if (!deleted) {
    return apiError('INVALID_REQUEST', 404, 'Teacher lesson not found');
  }

  return apiSuccess({ deleted });
}
