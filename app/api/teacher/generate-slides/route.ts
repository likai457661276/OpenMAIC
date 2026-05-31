import { after, type NextRequest } from 'next/server';
import { nanoid } from 'nanoid';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { buildRequestBaseUrl } from '@/lib/server/classroom-storage';
import { createClassroomGenerationJob } from '@/lib/server/classroom-job-store';
import { runClassroomGenerationJob } from '@/lib/server/classroom-job-runner';
import { getFeatureFlags } from '@/lib/feature-flags';
import { SlideAdapter, type TeacherSlideGenerationInput } from '@/lib/teacher/adapters';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<TeacherSlideGenerationInput>;
    if (!body.lessonId) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Missing required field: lessonId');
    }

    const adapter = new SlideAdapter({ featureFlags: getFeatureFlags() });
    const payload = await adapter.execute({
      lessonId: body.lessonId,
      lessonTitle: body.lessonTitle,
      topic: body.topic,
      slideCount: body.slideCount,
      style: body.style,
    });

    const baseUrl = buildRequestBaseUrl(req);
    const jobId = nanoid(10);
    const job = await createClassroomGenerationJob(jobId, payload.classroomInput);
    after(() => runClassroomGenerationJob(jobId, payload.classroomInput, baseUrl));

    return apiSuccess(
      {
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
