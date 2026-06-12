import { AutoImportTeacherBridge } from '@/components/auto-teacher/auto-import-teacher-bridge';
import { parseAllowedOrigins } from '@/lib/auto-teacher/protocol';

export const dynamic = 'force-dynamic';

export default function AutoImportTeacherPage() {
  const allowedOrigins = parseAllowedOrigins(process.env.NEXT_PUBLIC_AUTO_TEACHER_ALLOWED_ORIGINS);
  return <AutoImportTeacherBridge allowedOrigins={allowedOrigins} />;
}
