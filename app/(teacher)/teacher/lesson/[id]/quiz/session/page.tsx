import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FeedbackPanel } from '@/components/teacher/feedback-panel';
import { ParticipantList } from '@/components/teacher/participant-list';
import { QRCodeDisplay } from '@/components/teacher/qr-code-display';
import { QuizResultsChart } from '@/components/teacher/quiz-results-chart';
import { QuizSessionControl } from '@/components/teacher/quiz-session-control';
import { ScoreReport } from '@/components/teacher/score-report';
import { getTeacherLesson } from '@/lib/teacher/lesson-service';
import { getQuizSet } from '@/lib/teacher/quiz-service';
import { getQuizSession } from '@/lib/teacher/realtime-service';
import { buildSessionReport } from '@/lib/teacher/scoring-service';
import { listLessonFeedbackSessions, summarizeFeedback } from '@/lib/teacher/feedback-service';
import { appPath } from '@/lib/app-paths';

interface QuizSessionPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sessionId?: string }>;
}

export default async function QuizSessionPage({ params, searchParams }: QuizSessionPageProps) {
  const { id } = await params;
  const { sessionId } = await searchParams;
  const lesson = await getTeacherLesson(id);
  if (!lesson || !sessionId) notFound();
  const session = await getQuizSession(sessionId);
  if (!session) notFound();
  const quizSet = await getQuizSet(session.quizSetId);
  if (!quizSet) notFound();

  const feedbackSessions = await listLessonFeedbackSessions(id);
  const report = session.participants.length ? await buildSessionReport(session.id) : null;
  const joinUrl = appPath(`/join/${session.sessionCode}`);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-5">
        <div>
          <div className="text-sm text-muted-foreground">Quiz：{quizSet.title}</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">实时答题控制台</h1>
        </div>
        <Button asChild variant="outline">
          <Link href={`/teacher/lesson/${id}/quiz`}>
            <ArrowLeft className="size-4" />
            返回 Quiz
          </Link>
        </Button>
      </header>

      <QuizSessionControl session={session} />

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="grid content-start gap-6">
          <QRCodeDisplay sessionCode={session.sessionCode} joinUrl={joinUrl} />
          <ParticipantList participants={session.participants} />
        </div>
        <div className="grid gap-6">
          <QuizResultsChart report={report} />
          <FeedbackPanel
            lessonId={id}
            sessions={feedbackSessions}
            summaries={feedbackSessions.map(summarizeFeedback)}
          />
          {report ? <ScoreReport report={report} /> : null}
        </div>
      </div>
    </div>
  );
}
