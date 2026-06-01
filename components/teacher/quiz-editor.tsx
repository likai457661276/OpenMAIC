'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Play, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiPath } from '@/lib/app-paths';
import type { LessonPlan, QuizQuestion, QuizSet } from '@/lib/teacher/types';

function answerToText(answer: string | string[]) {
  return Array.isArray(answer) ? answer.join(',') : answer;
}

function textToAnswer(value: string, original: string | string[]) {
  return Array.isArray(original)
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : value.trim();
}

export function QuizEditor({
  lesson,
  initialQuizSet,
}: {
  readonly lesson: LessonPlan;
  readonly initialQuizSet: QuizSet | null;
}) {
  const router = useRouter();
  const [quizSet, setQuizSet] = useState(initialQuizSet);
  const [pending, setPending] = useState(false);

  async function generateQuiz() {
    setPending(true);
    try {
      const response = await fetch(apiPath('/api/teacher/generate-quiz'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: lesson.id,
          topic: `${lesson.title} Quiz 测验`,
          questionCount: 5,
          questionTypes: [
            'single-choice',
            'multiple-choice',
            'true-false',
            'fill-blank',
            'short-answer',
          ],
          difficulty: 'mixed',
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || '生成 Quiz 失败');
      setQuizSet(json.quizSet);
      toast.success('Quiz 已生成');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '生成 Quiz 失败');
    } finally {
      setPending(false);
    }
  }

  async function saveQuiz() {
    if (!quizSet) return;
    setPending(true);
    try {
      const response = await fetch(apiPath(`/api/teacher/quiz/${quizSet.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quizSet),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || '保存 Quiz 失败');
      setQuizSet(json.quizSet);
      toast.success('Quiz 已保存');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存 Quiz 失败');
    } finally {
      setPending(false);
    }
  }

  async function startSession() {
    if (!quizSet) return;
    setPending(true);
    try {
      const response = await fetch(apiPath('/api/teacher/quiz-session'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizSetId: quizSet.id }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || '发起答题失败');
      router.push(`/teacher/lesson/${lesson.id}/quiz/session?sessionId=${json.session.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '发起答题失败');
    } finally {
      setPending(false);
    }
  }

  function updateQuestion(questionId: string, patch: Partial<QuizQuestion>) {
    setQuizSet((current) =>
      current
        ? {
            ...current,
            questions: current.questions.map((question) =>
              question.id === questionId ? { ...question, ...patch } : question,
            ),
          }
        : current,
    );
  }

  if (!quizSet) {
    return (
      <section className="grid gap-4 rounded-lg border border-border p-5">
        <div>
          <h2 className="text-lg font-semibold">生成 Quiz 测验</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            基于当前教案自动创建选择、判断、填空和简答题。
          </p>
        </div>
        <Button type="button" onClick={generateQuiz} disabled={pending} className="w-fit">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          生成 Quiz
        </Button>
      </section>
    );
  }

  return (
    <section className="grid gap-5 rounded-lg border border-border p-5">
      <div className="grid gap-4 md:grid-cols-[1fr_160px]">
        <div className="grid gap-2">
          <Label htmlFor="quiz-title">测验标题</Label>
          <Input
            id="quiz-title"
            value={quizSet.title}
            onChange={(event) => setQuizSet({ ...quizSet, title: event.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="quiz-time">时限（分钟）</Label>
          <Input
            id="quiz-time"
            type="number"
            min={1}
            value={quizSet.timeLimit || 10}
            onChange={(event) =>
              setQuizSet({ ...quizSet, timeLimit: Number(event.target.value || 10) })
            }
          />
        </div>
      </div>
      <div className="grid gap-4">
        {quizSet.questions
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((question) => (
            <article key={question.id} className="grid gap-3 rounded-md border border-border p-4">
              <div className="grid gap-2">
                <Label>题干</Label>
                <Textarea
                  value={question.content}
                  onChange={(event) => updateQuestion(question.id, { content: event.target.value })}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_120px_160px]">
                <div className="grid gap-2">
                  <Label>答案</Label>
                  <Input
                    value={answerToText(question.correctAnswer)}
                    onChange={(event) =>
                      updateQuestion(question.id, {
                        correctAnswer: textToAnswer(event.target.value, question.correctAnswer),
                      })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>分值</Label>
                  <Input
                    type="number"
                    min={1}
                    value={question.score}
                    onChange={(event) =>
                      updateQuestion(question.id, { score: Number(event.target.value || 1) })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>知识点</Label>
                  <Input
                    value={question.knowledgePoint || ''}
                    onChange={(event) =>
                      updateQuestion(question.id, { knowledgePoint: event.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>解析</Label>
                <Textarea
                  value={question.explanation}
                  onChange={(event) =>
                    updateQuestion(question.id, { explanation: event.target.value })
                  }
                />
              </div>
            </article>
          ))}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={generateQuiz} disabled={pending}>
          <Sparkles className="size-4" />
          重新生成
        </Button>
        <Button type="button" variant="outline" onClick={saveQuiz} disabled={pending}>
          <Save className="size-4" />
          保存
        </Button>
        <Button type="button" onClick={startSession} disabled={pending}>
          <Play className="size-4" />
          发起答题
        </Button>
      </div>
    </section>
  );
}
