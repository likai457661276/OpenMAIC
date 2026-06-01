import { notFound } from 'next/navigation';
import { StudentQuizClient } from '@/components/teacher/student-quiz-client';
import { listLessonFeedbackSessions } from '@/lib/teacher/feedback-service';
import { getQuizSet } from '@/lib/teacher/quiz-service';
import { findQuizSessionByCode } from '@/lib/teacher/realtime-service';

interface JoinPageProps {
  params: Promise<{ sessionCode: string }>;
}

export default async function JoinSessionPage({ params }: JoinPageProps) {
  const { sessionCode } = await params;
  const session = await findQuizSessionByCode(sessionCode);
  if (!session) notFound();
  const quizSet = await getQuizSet(session.quizSetId);
  if (!quizSet) notFound();
  const feedbackSessions = (await listLessonFeedbackSessions(quizSet.lessonId)).filter(
    (item) => item.status === 'active',
  );
  return (
    <StudentQuizClient
      initialSession={session}
      quizSet={quizSet}
      feedbackSessions={feedbackSessions}
    />
  );
}
