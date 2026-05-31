import { Badge } from '@/components/ui/badge';
import type { LessonPlan } from '@/lib/teacher/types';

export function LessonViewer({ lesson }: { readonly lesson: LessonPlan }) {
  return (
    <div className="grid gap-5">
      <section className="grid gap-3 rounded-lg border border-border bg-background p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{lesson.subject}</Badge>
          <Badge variant="outline">{lesson.grade}</Badge>
          <Badge variant="outline">{lesson.duration} 分钟</Badge>
          <Badge>{lesson.status}</Badge>
        </div>
        <div className="grid gap-2">
          <h2 className="text-lg font-semibold">教学目标</h2>
          <ul className="grid gap-2 text-sm leading-6 text-muted-foreground">
            {lesson.objectives.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid gap-4 rounded-lg border border-border bg-background p-4">
        <h2 className="text-lg font-semibold">重点难点</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <div className="text-sm font-medium">教学重点</div>
            {lesson.keyPoints.map((item) => (
              <div key={item} className="rounded-md bg-muted px-3 py-2 text-sm">
                {item}
              </div>
            ))}
          </div>
          <div className="grid gap-2">
            <div className="text-sm font-medium">教学难点</div>
            {lesson.difficulties.map((item) => (
              <div key={item} className="rounded-md bg-muted px-3 py-2 text-sm">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-lg border border-border bg-background p-4">
        <h2 className="text-lg font-semibold">教学流程</h2>
        <div className="grid gap-3">
          {lesson.teachingProcess.map((phase) => (
            <div key={phase.name} className="grid gap-3 border-l-2 border-primary/40 pl-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium">{phase.name}</h3>
                <Badge variant="outline">{phase.duration} 分钟</Badge>
              </div>
              <div className="grid gap-3 text-sm sm:grid-cols-3">
                <p>
                  <span className="font-medium">教师：</span>
                  {phase.teacherActivity}
                </p>
                <p>
                  <span className="font-medium">学生：</span>
                  {phase.studentActivity}
                </p>
                <p>
                  <span className="font-medium">意图：</span>
                  {phase.designIntent}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-3 rounded-lg border border-border bg-background p-4">
        <h2 className="text-lg font-semibold">作业与反思</h2>
        <p className="text-sm leading-6 text-muted-foreground">{lesson.homework}</p>
        <p className="text-sm leading-6 text-muted-foreground">{lesson.reflection}</p>
      </section>
    </div>
  );
}
