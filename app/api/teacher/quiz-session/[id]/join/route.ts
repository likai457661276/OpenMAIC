import { type NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { joinQuizSession } from '@/lib/teacher/realtime-service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = (await req.json()) as { name?: string };
    const result = await joinQuizSession(id, body.name || '');
    return apiSuccess(result, 201);
  } catch (error) {
    return apiError(
      'INVALID_REQUEST',
      400,
      'Failed to join quiz session',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}
