import { AutoTeacherBridge } from '@/components/auto-teacher/auto-teacher-bridge';
import { parseAllowedOrigins } from '@/lib/auto-teacher/protocol';

export const dynamic = 'force-dynamic';

export default function AutoTeacherPage() {
  const allowedOrigins = parseAllowedOrigins(process.env.NEXT_PUBLIC_AUTO_TEACHER_ALLOWED_ORIGINS);
  return <AutoTeacherBridge allowedOrigins={allowedOrigins} />;
}
