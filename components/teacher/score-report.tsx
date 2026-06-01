import { QuestionAnalysis } from './question-analysis';
import { ScoreDistribution } from './score-distribution';
import { StudentScoreCard } from './student-score-card';
import type { SessionReport } from '@/lib/teacher/types';

export function ScoreReport({ report }: { readonly report: SessionReport }) {
  return (
    <section className="grid gap-5 rounded-lg border border-border p-5">
      <div>
        <h2 className="text-base font-semibold">{report.quizTitle} 评分报告</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          平均分 {report.averageScore}，最高分 {report.highestScore}，最低分 {report.lowestScore}
        </p>
      </div>
      <ScoreDistribution ranges={report.scoreDistribution} />
      <div className="grid gap-3 md:grid-cols-2">
        {report.results.map((result) => (
          <StudentScoreCard key={result.participantId} result={result} />
        ))}
      </div>
      <QuestionAnalysis items={report.questionAnalysis} />
    </section>
  );
}
