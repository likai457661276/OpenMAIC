import { Badge } from '@/components/ui/badge';
import type { QuizQuestion } from '@/lib/teacher/types';

export function QuizQuestionCard({ question }: { readonly question: QuizQuestion }) {
  return (
    <article className="grid gap-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">第 {question.order} 题</div>
          <h3 className="mt-1 text-sm font-medium leading-6">{question.content}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="secondary">{question.type}</Badge>
          <Badge variant="outline">{question.score} 分</Badge>
        </div>
      </div>
      {question.options?.length ? (
        <div className="grid gap-2">
          {question.options.map((option) => (
            <div
              key={option.id}
              className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm"
            >
              <span className="font-medium">{option.label}.</span>
              <span className="min-w-0 flex-1">{option.content}</span>
              {option.isCorrect && <Badge>答案</Badge>}
            </div>
          ))}
        </div>
      ) : null}
      <div className="grid gap-1 text-sm">
        <div>
          <span className="text-muted-foreground">正确答案：</span>
          {Array.isArray(question.correctAnswer)
            ? question.correctAnswer.join('、')
            : question.correctAnswer}
        </div>
        <div className="text-muted-foreground">{question.explanation}</div>
      </div>
    </article>
  );
}
