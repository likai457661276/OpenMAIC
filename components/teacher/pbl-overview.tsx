import { Badge } from '@/components/ui/badge';
import type { PBLProject } from '@/lib/teacher/types';

export function PBLOverview({ project }: { readonly project: PBLProject }) {
  return (
    <section className="grid gap-4 rounded-lg border border-border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{project.title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{project.background}</p>
        </div>
        <Badge>{project.status}</Badge>
      </div>
      <div className="rounded-md bg-muted/50 p-4">
        <div className="text-xs text-muted-foreground">驱动性问题</div>
        <div className="mt-1 text-sm font-medium">{project.drivingQuestion}</div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {project.objectives.map((objective) => (
          <div key={objective} className="rounded-md border border-border px-3 py-2 text-sm">
            {objective}
          </div>
        ))}
      </div>
    </section>
  );
}
