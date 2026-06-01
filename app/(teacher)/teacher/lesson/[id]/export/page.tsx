import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TeacherExportPanel } from '@/components/teacher/export-panel';
import { getTeacherLesson } from '@/lib/teacher/lesson-service';
import { createSlideSetFromLesson, getLessonSlideSet } from '@/lib/teacher/slide-service';

interface ExportPageProps {
  params: Promise<{ id: string }>;
}

export default async function LessonExportPage({ params }: ExportPageProps) {
  const { id } = await params;
  const lesson = await getTeacherLesson(id);
  if (!lesson) notFound();
  const slideSet = (await getLessonSlideSet(id)) ?? (await createSlideSetFromLesson(lesson));

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5">
      <section className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="text-sm text-muted-foreground">
            {lesson.subject} · {lesson.grade}
          </div>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <FileDown className="size-5" />
            导出课件
          </h1>
        </div>
        <Button asChild variant="outline">
          <Link href={`/teacher/lesson/${id}`}>
            <ArrowLeft className="size-4" />
            返回教案
          </Link>
        </Button>
      </section>
      <TeacherExportPanel lesson={lesson} slideSet={slideSet} />
    </div>
  );
}
