import { Badge } from '@/components/ui/badge';
import type { EvaluationRubric } from '@/lib/teacher/types';

export function PBLRubricEditor({ rubric }: { readonly rubric: EvaluationRubric }) {
  return (
    <section className="grid gap-3 rounded-lg border border-border p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">评价标准</h2>
        <Badge variant="outline">总分 {rubric.totalScore}</Badge>
      </div>
      {rubric.dimensions.map((dimension) => (
        <article key={dimension.name} className="grid gap-2 rounded-md border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium">{dimension.name}</h3>
            <span className="text-xs text-muted-foreground">权重 {dimension.weight}%</span>
          </div>
          <div className="grid gap-2">
            {dimension.levels.map((level) => (
              <div key={level.level} className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                <span className="font-medium">{level.level}</span>
                <span className="mx-2 text-muted-foreground">{level.score} 分</span>
                <span>{level.description}</span>
              </div>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}
