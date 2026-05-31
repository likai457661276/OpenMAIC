import { HomePage } from '@/app/page';
import { TeacherModeProvider } from '@/lib/teacher/teacher-mode-provider';

export default function TeacherEntryPage() {
  return (
    <TeacherModeProvider>
      <HomePage />
    </TeacherModeProvider>
  );
}
