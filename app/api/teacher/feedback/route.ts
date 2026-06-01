import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import {
  buildFeedbackReport,
  createFeedbackSession,
  listLessonFeedbackSessions,
  summarizeFeedback,
} from '@/lib/teacher/feedback-service';

export async function GET(req: NextRequest) {
  const lessonId = req.nextUrl.searchParams.get('lessonId');
  const report = req.nextUrl.searchParams.get('report');
  if (!lessonId) {
    return apiError('MISSING_REQUIRED_FIELD', 400, 'Missing required field: lessonId');
  }
  if (report === '1') {
    return apiSuccess({ report: await buildFeedbackReport(lessonId) });
  }
  const sessions = await listLessonFeedbackSessions(lessonId);
  return apiSuccess({
    sessions,
    summaries: sessions.map(summarizeFeedback),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Parameters<typeof createFeedbackSession>[0];
    if (!body.lessonId || !body.type) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Missing required feedback fields');
    }
    const session = await createFeedbackSession(body);
    return apiSuccess({ session, summary: summarizeFeedback(session) }, 201);
  } catch (error) {
    return apiError(
      'INVALID_REQUEST',
      400,
      'Failed to create feedback session',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}
