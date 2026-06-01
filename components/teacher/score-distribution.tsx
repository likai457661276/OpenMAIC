import type { ScoreRange } from '@/lib/teacher/types';

export function ScoreDistribution({ ranges }: { readonly ranges: ScoreRange[] }) {
  const max = Math.max(1, ...ranges.map((range) => range.count));
  return (
    <div className="grid gap-2">
      {ranges.map((range) => (
        <div key={range.label} className="grid gap-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{range.label}</span>
            <span>{range.count} 人</span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary"
              style={{ width: `${(range.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
