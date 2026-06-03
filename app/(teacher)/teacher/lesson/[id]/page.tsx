import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Puzzle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LessonEditor } from '@/components/teacher/lesson-editor';
import { LessonViewer } from '@/components/teacher/lesson-viewer';
import { getTeacherLesson } from '@/lib/teacher/lesson-service';

interface LessonPageProps {
  params: Promise<{ id: string }>;
}

const lessonSections = [
  { href: 'quiz', label: 'Quiz 互动', icon: Sparkles },
  { href: 'pbl', label: 'PBL 管理', icon: Puzzle },
];

export default async function LessonDetailPage({ params }: LessonPageProps) {
  const { id } = await params;
  const lesson = await getTeacherLesson(id);
  if (!lesson) notFound();

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <section className="border-b border-border pb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm text-muted-foreground">教案 ID：{id}</div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{lesson.title}</h1>
          </div>
        </div>
      </section>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {lessonSections.map((item) => (
          <Button key={item.href} asChild variant="outline" className="h-16 justify-start">
            <Link href={`/teacher/lesson/${id}/${item.href}`}>
              <item.icon className="size-4" />
              {item.label}
            </Link>
          </Button>
        ))}
      </div>
      <LessonViewer lesson={lesson} />
      <LessonEditor lesson={lesson} />
    </div>
  );
}
