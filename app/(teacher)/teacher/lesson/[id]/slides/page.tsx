import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TeacherSlideEditor } from '@/components/teacher/slide-editor';
import { getTeacherLesson } from '@/lib/teacher/lesson-service';
import { createSlideSetFromLesson, getLessonSlideSet } from '@/lib/teacher/slide-service';

interface SlidesPageProps {
  params: Promise<{ id: string }>;
}

export default async function LessonSlidesPage({ params }: SlidesPageProps) {
  const { id } = await params;
  const lesson = await getTeacherLesson(id);
  if (!lesson) notFound();
  const slideSet = (await getLessonSlideSet(id)) ?? (await createSlideSetFromLesson(lesson));

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-5">
      <section className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="text-sm text-muted-foreground">
            {lesson.subject} · {lesson.grade}
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{lesson.title} · 课件</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`/teacher/lesson/${id}`}>
              <ArrowLeft className="size-4" />
              返回教案
            </Link>
          </Button>
        </div>
      </section>
      <TeacherSlideEditor slideSet={slideSet} />
    </div>
  );
}
