import type { SessionReport } from '@/lib/teacher/types';

export function QuizResultsChart({ report }: { readonly report: SessionReport | null }) {
  if (!report) {
    return (
      <section className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
        暂无评分报告，学生提交后可查看统计。
      </section>
    );
  }

  return (
    <section className="grid gap-4 rounded-lg border border-border p-4">
      <h2 className="text-base font-semibold">结果统计</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md bg-muted/50 p-3">
          <div className="text-xs text-muted-foreground">平均分</div>
          <div className="mt-1 text-xl font-semibold">{report.averageScore}</div>
        </div>
        <div className="rounded-md bg-muted/50 p-3">
          <div className="text-xs text-muted-foreground">最高分</div>
          <div className="mt-1 text-xl font-semibold">{report.highestScore}</div>
        </div>
        <div className="rounded-md bg-muted/50 p-3">
          <div className="text-xs text-muted-foreground">参与人数</div>
          <div className="mt-1 text-xl font-semibold">{report.participantCount}</div>
        </div>
      </div>
      <div className="grid gap-2">
        {report.questionAnalysis.map((item) => (
          <div key={item.questionId} className="grid gap-1 text-sm">
            <div className="line-clamp-1">{item.content}</div>
            <div className="h-2 rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${item.correctRate}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground">正确率 {item.correctRate}%</div>
          </div>
        ))}
      </div>
    </section>
  );
}
