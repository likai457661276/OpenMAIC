import { timingSafeEqual } from 'crypto';
import { apiError, apiSuccess } from '@/lib/server/api-response';

const DEFAULT_SETTINGS_PASSWORD = 'bingo@666';

function getSettingsPassword(): string {
  return process.env.SETTINGS_PASSWORD || DEFAULT_SETTINGS_PASSWORD;
}

export async function POST(request: Request) {
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }

  const password = getSettingsPassword();
  if (!body.password) {
    return apiError('INVALID_REQUEST', 401, 'Invalid settings password');
  }

  const encoder = new TextEncoder();
  const provided = encoder.encode(body.password);
  const expected = encoder.encode(password);
  if (provided.byteLength !== expected.byteLength || !timingSafeEqual(provided, expected)) {
    return apiError('INVALID_REQUEST', 401, 'Invalid settings password');
  }

  return apiSuccess({ valid: true });
}
