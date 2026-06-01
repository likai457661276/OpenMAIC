'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { QuizSet } from '@/lib/teacher/types';

export function QuizPreview({ quizSet }: { readonly quizSet: QuizSet }) {
  const questions = useMemo(
    () => quizSet.questions.slice().sort((a, b) => a.order - b.order),
    [quizSet.questions],
  );
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const score = questions.reduce((sum, question) => {
    const expected = Array.isArray(question.correctAnswer)
      ? question.correctAnswer.join(',')
      : question.correctAnswer;
    return answers[question.id] === expected ? sum + question.score : sum;
  }, 0);

  return (
    <section className="grid gap-4 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">学生预览</h2>
        <Badge variant="outline">{quizSet.timeLimit || 0} 分钟</Badge>
      </div>
      {questions.map((question) => (
        <div key={question.id} className="grid gap-2 border-b border-border pb-3 last:border-0">
          <div className="text-sm font-medium">
            {question.order}. {question.content}
          </div>
          {question.options?.length ? (
            <div className="grid gap-2">
              {question.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() =>
                    setAnswers((current) => ({ ...current, [question.id]: option.label }))
                  }
                  className="flex min-h-10 items-center gap-2 rounded-md border border-border px-3 text-left text-sm"
                >
                  <span className="font-medium">{option.label}</span>
                  <span>{option.content}</span>
                </button>
              ))}
            </div>
          ) : (
            <textarea
              value={answers[question.id] || ''}
              onChange={(event) =>
                setAnswers((current) => ({ ...current, [question.id]: event.target.value }))
              }
              className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          )}
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {submitted ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4" />
            预览得分 {score}/{quizSet.totalScore}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">模拟学生提交后可查看得分。</div>
        )}
        <Button type="button" onClick={() => setSubmitted(true)}>
          提交预览
        </Button>
      </div>
    </section>
  );
}
