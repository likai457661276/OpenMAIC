import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createPBLProjectFromLesson, listLessonPBLProjects } from '@/lib/teacher/pbl-service';

export async function GET(req: NextRequest) {
  const lessonId = req.nextUrl.searchParams.get('lessonId');
  if (!lessonId) {
    return apiError('MISSING_REQUIRED_FIELD', 400, 'Missing required field: lessonId');
  }
  const projects = await listLessonPBLProjects(lessonId);
  return apiSuccess({ projects });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Parameters<typeof createPBLProjectFromLesson>[0];
    if (!body.lessonId) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Missing required field: lessonId');
    }
    const project = await createPBLProjectFromLesson(body);
    return apiSuccess({ project }, 201);
  } catch (error) {
    return apiError(
      'INVALID_REQUEST',
      400,
      'Failed to create PBL project',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}
