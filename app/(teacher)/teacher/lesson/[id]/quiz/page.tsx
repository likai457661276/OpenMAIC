import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuizEditor } from '@/components/teacher/quiz-editor';
import { QuizPreview } from '@/components/teacher/quiz-preview';
import { QuizQuestionCard } from '@/components/teacher/quiz-question-card';
import { getTeacherLesson } from '@/lib/teacher/lesson-service';
import { getQuizSet, listLessonQuizzes } from '@/lib/teacher/quiz-service';

interface QuizPageProps {
  params: Promise<{ id: string }>;
}

export default async function LessonQuizPage({ params }: QuizPageProps) {
  const { id } = await params;
  const lesson = await getTeacherLesson(id);
  if (!lesson) notFound();

  const summaries = await listLessonQuizzes(id);
  const quizSet = summaries[0] ? await getQuizSet(summaries[0].id) : null;

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-5">
        <div>
          <div className="text-sm text-muted-foreground">教案：{lesson.title}</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Quiz 测验</h1>
        </div>
        <Button asChild variant="outline">
          <Link href={`/teacher/lesson/${id}`}>
            <ArrowLeft className="size-4" />
            返回教案
          </Link>
        </Button>
      </header>

      <QuizEditor lesson={lesson} initialQuizSet={quizSet} />

      {quizSet ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="grid gap-3">
            {quizSet.questions
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((question) => (
                <QuizQuestionCard key={question.id} question={question} />
              ))}
          </section>
          <QuizPreview quizSet={quizSet} />
        </div>
      ) : null}
    </div>
  );
}
