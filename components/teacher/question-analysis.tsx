import type { QuestionAnalysis as QuestionAnalysisData } from '@/lib/teacher/types';

export function QuestionAnalysis({ items }: { readonly items: QuestionAnalysisData[] }) {
  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <article key={item.questionId} className="rounded-md border border-border p-3 text-sm">
          <div className="font-medium">{item.content}</div>
          <div className="mt-2 text-muted-foreground">
            正确率 {item.correctRate}% · 平均耗时 {item.averageTime} 秒
          </div>
          {item.commonWrongAnswers.length ? (
            <div className="mt-1 text-muted-foreground">
              常见错误：{item.commonWrongAnswers.join('、')}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
