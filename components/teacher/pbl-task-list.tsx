import { Badge } from '@/components/ui/badge';
import type { PBLTask } from '@/lib/teacher/types';

export function PBLTaskList({ tasks }: { readonly tasks: PBLTask[] }) {
  return (
    <section className="grid gap-3 rounded-lg border border-border p-5">
      <h2 className="text-base font-semibold">项目任务</h2>
      {tasks
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((task) => (
          <article key={task.id} className="grid gap-2 rounded-md border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium">
                {task.order}. {task.title}
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{task.type === 'group' ? '小组' : '个人'}</Badge>
                <Badge variant="outline">{task.duration}</Badge>
              </div>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">{task.description}</p>
            <div className="text-sm">产出：{task.expectedOutcome}</div>
          </article>
        ))}
    </section>
  );
}
