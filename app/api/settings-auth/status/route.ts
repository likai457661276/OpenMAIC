import { apiSuccess } from '@/lib/server/api-response';

export async function GET() {
  return apiSuccess({ authenticated: false });
}
