import { Badge } from '@/components/ui/badge';
import type { ScoringResult } from '@/lib/teacher/types';

export function StudentScoreCard({ result }: { readonly result: ScoringResult }) {
  return (
    <article className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm">
      <div>
        <div className="font-medium">{result.participantName}</div>
        <div className="text-muted-foreground">
          {result.totalScore}/{result.maxScore} 分
        </div>
      </div>
      <Badge variant={result.percentage >= 60 ? 'default' : 'secondary'}>
        {result.percentage}%
      </Badge>
    </article>
  );
}
