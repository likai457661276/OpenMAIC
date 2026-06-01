'use client';

import { useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiPath } from '@/lib/app-paths';
import type { FeedbackSession, Participant, QuizSet, QuizSession } from '@/lib/teacher/types';

export function StudentQuizClient({
  initialSession,
  quizSet,
  feedbackSessions,
}: {
  readonly initialSession: QuizSession;
  readonly quizSet: QuizSet;
  readonly feedbackSessions: FeedbackSession[];
}) {
  const questions = useMemo(
    () => quizSet.questions.slice().sort((a, b) => a.order - b.order),
    [quizSet.questions],
  );
  const [session, setSession] = useState(initialSession);
  const [name, setName] = useState('');
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  async function join() {
    try {
      const response = await fetch(apiPath(`/api/teacher/quiz-session/${session.id}/join`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || '加入失败');
      setSession(json.session);
      setParticipant(json.participant);
      toast.success('已加入答题');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加入失败');
    }
  }

  async function submit(questionId: string) {
    if (!participant) return;
    try {
      const response = await fetch(apiPath(`/api/teacher/quiz-session/${session.id}/answer`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: participant.id,
          questionId,
          answer: answers[questionId] || '',
          timeTaken: 0,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || '提交失败');
      setSession(json.session);
      toast.success(json.answer.isCorrect ? '回答正确' : '答案已提交');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '提交失败');
    }
  }

  async function submitFeedback(feedbackSession: FeedbackSession, value: string | number) {
    if (!participant) return;
    try {
      const response = await fetch(apiPath(`/api/teacher/feedback/${feedbackSession.id}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: participant.id,
          participantName: participant.name,
          value,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || '提交反馈失败');
      toast.success('反馈已提交');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '提交反馈失败');
    }
  }

  if (!participant) {
    return (
      <section className="mx-auto grid w-full max-w-md gap-4 rounded-lg border border-border p-5">
        <div>
          <div className="text-sm text-muted-foreground">会话码 {session.sessionCode}</div>
          <h1 className="mt-2 text-xl font-semibold">{quizSet.title}</h1>
        </div>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="输入姓名"
        />
        <Button type="button" onClick={join}>
          加入答题
        </Button>
      </section>
    );
  }

  return (
    <section className="mx-auto grid w-full max-w-2xl gap-4">
      <header className="border-b border-border pb-4">
        <div className="text-sm text-muted-foreground">{participant.name}</div>
        <h1 className="mt-1 text-xl font-semibold">{quizSet.title}</h1>
      </header>
      {questions.map((question) => (
        <article key={question.id} className="grid gap-3 rounded-lg border border-border p-4">
          <h2 className="text-sm font-medium">
            {question.order}. {question.content}
          </h2>
          {question.options?.length ? (
            <div className="grid gap-2">
              {question.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() =>
                    setAnswers((current) => ({ ...current, [question.id]: option.label }))
                  }
                  className="rounded-md border border-border px-3 py-2 text-left text-sm"
                >
                  {option.label}. {option.content}
                </button>
              ))}
            </div>
          ) : (
            <Input
              value={answers[question.id] || ''}
              onChange={(event) =>
                setAnswers((current) => ({ ...current, [question.id]: event.target.value }))
              }
              placeholder="输入答案"
            />
          )}
          <Button type="button" className="w-fit" onClick={() => submit(question.id)}>
            <Send className="size-4" />
            提交本题
          </Button>
        </article>
      ))}
      {feedbackSessions.length ? (
        <section className="grid gap-3 rounded-lg border border-border p-4">
          <h2 className="text-base font-semibold">课堂反馈</h2>
          {feedbackSessions.map((feedbackSession) => (
            <article
              key={feedbackSession.id}
              className="grid gap-3 border-b border-border pb-3 last:border-0"
            >
              <div className="text-sm font-medium">{feedbackSession.question}</div>
              {feedbackSession.type === 'free-text' ? (
                <Input
                  placeholder="输入反馈后按回车"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && event.currentTarget.value.trim()) {
                      submitFeedback(feedbackSession, event.currentTarget.value.trim());
                      event.currentTarget.value = '';
                    }
                  }}
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {['1', '2', '3', '4', '5'].map((value) => (
                    <Button
                      key={value}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => submitFeedback(feedbackSession, value)}
                    >
                      {value}
                    </Button>
                  ))}
                </div>
              )}
            </article>
          ))}
        </section>
      ) : null}
    </section>
  );
}
