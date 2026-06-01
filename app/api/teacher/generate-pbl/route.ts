import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getFeatureFlags } from '@/lib/feature-flags';
import { PBLAdapter, type TeacherPBLGenerationInput } from '@/lib/teacher/adapters';
import { createPBLProjectFromLesson } from '@/lib/teacher/pbl-service';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<TeacherPBLGenerationInput>;
    if (!body.lessonId) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Missing required field: lessonId');
    }

    const adapter = new PBLAdapter({ featureFlags: getFeatureFlags() });
    adapter.ensureAvailable();
    const project = await createPBLProjectFromLesson({
      lessonId: body.lessonId,
      topic: body.topic,
      issueCount: body.issueCount,
      targetSkills: body.targetSkills,
    });

    return apiSuccess({ project });
  } catch (error) {
    return apiError(
      'INVALID_REQUEST',
      400,
      'Failed to generate teacher PBL project',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}
