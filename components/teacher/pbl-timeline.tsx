import type { PBLPhase } from '@/lib/teacher/types';

export function PBLTimeline({ timeline }: { readonly timeline: PBLPhase[] }) {
  return (
    <section className="grid gap-3 rounded-lg border border-border p-5">
      <h2 className="text-base font-semibold">实施阶段</h2>
      <div className="grid gap-3">
        {timeline
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((phase) => (
            <article key={phase.id} className="grid gap-2 border-l-2 border-primary pl-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-medium">{phase.name}</h3>
                <span className="text-xs text-muted-foreground">{phase.duration}</span>
              </div>
              <ul className="grid gap-1 text-sm text-muted-foreground">
                {phase.activities.map((activity) => (
                  <li key={activity}>{activity}</li>
                ))}
              </ul>
              <div className="text-sm">里程碑：{phase.milestones.join('、')}</div>
            </article>
          ))}
      </div>
    </section>
  );
}
