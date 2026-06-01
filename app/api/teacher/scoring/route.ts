import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getQuizSession } from '@/lib/teacher/realtime-service';
import { scoreParticipant } from '@/lib/teacher/scoring-service';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { sessionId?: string; participantId?: string };
    if (!body.sessionId || !body.participantId) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Missing required scoring fields');
    }
    const session = await getQuizSession(body.sessionId);
    const participant = session?.participants.find((item) => item.id === body.participantId);
    if (!session || !participant) return apiError('INVALID_REQUEST', 404, 'Participant not found');
    const result = await scoreParticipant(session.id, participant);
    return apiSuccess({ result });
  } catch (error) {
    return apiError(
      'INVALID_REQUEST',
      400,
      'Failed to score participant',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}
