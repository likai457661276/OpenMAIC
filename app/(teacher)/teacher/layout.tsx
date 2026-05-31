import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getFeatureFlag } from '@/lib/feature-flags';

export default function TeacherLayout({ children }: { children: ReactNode }) {
  if (!getFeatureFlag('teacherExtension')) {
    redirect('/');
  }

  return children;
}
