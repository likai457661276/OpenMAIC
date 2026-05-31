import { after, type NextRequest } from 'next/server';
import { nanoid } from 'nanoid';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { buildRequestBaseUrl } from '@/lib/server/classroom-storage';
import { createClassroomGenerationJob } from '@/lib/server/classroom-job-store';
import { runClassroomGenerationJob } from '@/lib/server/classroom-job-runner';
import { getFeatureFlags } from '@/lib/feature-flags';
import { SlideAdapter, type TeacherSlideGenerationInput } from '@/lib/teacher/adapters';
import { getTeacherLesson } from '@/lib/teacher/lesson-service';
import { createSlideSetFromLesson, updateLessonSlideSet } from '@/lib/teacher/slide-service';
import type { TeacherSlideStyle, TeacherSlideType } from '@/lib/teacher/types';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<TeacherSlideGenerationInput>;
    if (!body.lessonId) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Missing required field: lessonId');
    }

    const lesson = await getTeacherLesson(body.lessonId);
    if (!lesson) {
      return apiError('INVALID_REQUEST', 404, 'Teacher lesson not found');
    }

    const adapter = new SlideAdapter({ featureFlags: getFeatureFlags() });
    const payload = await adapter.execute({
      lessonId: body.lessonId,
      lessonTitle: body.lessonTitle || lesson.title,
      topic: body.topic || lesson.title,
      slideCount: body.slideCount,
      style: body.style,
      includeTypes: body.includeTypes,
    });

    const baseUrl = buildRequestBaseUrl(req);
    const jobId = nanoid(10);
    const job = await createClassroomGenerationJob(jobId, payload.classroomInput);
    const slideSet = await createSlideSetFromLesson(lesson, {
      slideCount: body.slideCount,
      style: body.style as TeacherSlideStyle | undefined,
      includeTypes: body.includeTypes as TeacherSlideType[] | undefined,
    });
    await updateLessonSlideSet(lesson.id, { slides: slideSet.slides, sourceJobId: jobId });
    after(() => runClassroomGenerationJob(jobId, payload.classroomInput, baseUrl));

    return apiSuccess(
      {
        slideSetId: slideSet.id,
        slides: slideSet.slides,
        slideSet: { ...slideSet, sourceJobId: jobId },
        jobId,
        status: job.status,
        step: job.step,
        message: job.message,
        metadata: payload.metadata,
        pollUrl: `${baseUrl}/api/generate-classroom/${jobId}`,
        pollIntervalMs: 5000,
      },
      202,
    );
  } catch (error) {
    return apiError(
      'INVALID_REQUEST',
      400,
      'Failed to create teacher slide generation job',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}
