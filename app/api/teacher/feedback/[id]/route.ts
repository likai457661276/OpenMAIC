import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import {
  closeFeedbackSession,
  getFeedbackSession,
  submitFeedbackResponse,
  summarizeFeedback,
} from '@/lib/teacher/feedback-service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const session = await getFeedbackSession(id);
  if (!session) return apiError('INVALID_REQUEST', 404, 'Feedback session not found');
  return apiSuccess({ session, summary: summarizeFeedback(session) });
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = (await req.json()) as {
      participantId?: string;
      participantName?: string;
      value?: string | number;
      close?: boolean;
    };
    if (body.close) {
      const session = await closeFeedbackSession(id);
      if (!session) return apiError('INVALID_REQUEST', 404, 'Feedback session not found');
      return apiSuccess({ session, summary: summarizeFeedback(session) });
    }
    if (!body.participantId || body.value === undefined) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Missing required feedback response fields');
    }
    const session = await submitFeedbackResponse(id, {
      participantId: body.participantId,
      participantName: body.participantName || '匿名学生',
      value: body.value,
    });
    return apiSuccess({ session, summary: summarizeFeedback(session) });
  } catch (error) {
    return apiError(
      'INVALID_REQUEST',
      400,
      'Failed to submit feedback',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}
