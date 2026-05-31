import { after, type NextRequest } from 'next/server';
import { nanoid } from 'nanoid';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { buildRequestBaseUrl } from '@/lib/server/classroom-storage';
import { createClassroomGenerationJob } from '@/lib/server/classroom-job-store';
import { runClassroomGenerationJob } from '@/lib/server/classroom-job-runner';
import { getFeatureFlags } from '@/lib/feature-flags';
import { LessonAdapter, type TeacherLessonGenerationInput } from '@/lib/teacher/adapters';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<TeacherLessonGenerationInput>;
    if (!body.subject || !body.grade || !body.topic) {
      return apiError(
        'MISSING_REQUIRED_FIELD',
        400,
        'Missing required fields: subject, grade, topic',
      );
    }

    const adapter = new LessonAdapter({ featureFlags: getFeatureFlags() });
    const payload = await adapter.execute({
      subject: body.subject,
      grade: body.grade,
      topic: body.topic,
      objectives: body.objectives,
      duration: body.duration,
      style: body.style,
      enableWebSearch: body.enableWebSearch,
      enableImageGeneration: body.enableImageGeneration,
      enableVideoGeneration: body.enableVideoGeneration,
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
      'Failed to create teacher lesson generation job',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}
