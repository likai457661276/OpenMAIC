import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PBLOverview } from '@/components/teacher/pbl-overview';
import { PBLProjectPanel } from '@/components/teacher/pbl-project-panel';
import { PBLRubricEditor } from '@/components/teacher/pbl-rubric-editor';
import { PBLTaskList } from '@/components/teacher/pbl-task-list';
import { PBLTimeline } from '@/components/teacher/pbl-timeline';
import { getTeacherLesson } from '@/lib/teacher/lesson-service';
import { getPBLProject, listLessonPBLProjects } from '@/lib/teacher/pbl-service';

interface PBLPageProps {
  params: Promise<{ id: string }>;
}

export default async function LessonPBLPage({ params }: PBLPageProps) {
  const { id } = await params;
  const lesson = await getTeacherLesson(id);
  if (!lesson) notFound();

  const summaries = await listLessonPBLProjects(id);
  const project = summaries[0] ? await getPBLProject(summaries[0].id) : null;

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-5">
        <div>
          <div className="text-sm text-muted-foreground">教案：{lesson.title}</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">PBL 项目式学习</h1>
        </div>
        <Button asChild variant="outline">
          <Link href={`/teacher/lesson/${id}`}>
            <ArrowLeft className="size-4" />
            返回教案
          </Link>
        </Button>
      </header>

      <PBLProjectPanel lesson={lesson} initialProject={project} />

      {project ? (
        <div className="grid gap-6">
          <PBLOverview project={project} />
          <div className="grid gap-6 lg:grid-cols-2">
            <PBLTaskList tasks={project.tasks} />
            <PBLTimeline timeline={project.timeline} />
          </div>
          <PBLRubricEditor rubric={project.evaluationCriteria} />
        </div>
      ) : null}
    </div>
  );
}
