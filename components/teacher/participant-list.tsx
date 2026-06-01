import { Badge } from '@/components/ui/badge';
import type { Participant } from '@/lib/teacher/types';

export function ParticipantList({ participants }: { readonly participants: Participant[] }) {
  return (
    <section className="grid gap-3 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">参与者</h2>
        <Badge variant="outline">{participants.length} 人</Badge>
      </div>
      <div className="grid gap-2">
        {participants.length ? (
          participants.map((participant) => (
            <div
              key={participant.id}
              className="flex min-h-10 items-center justify-between gap-3 rounded-md bg-muted/50 px-3 text-sm"
            >
              <span>{participant.name}</span>
              <span className="text-muted-foreground">
                {participant.answers.length} 题 / {participant.totalScore} 分
              </span>
            </div>
          ))
        ) : (
          <div className="text-sm text-muted-foreground">等待学生加入。</div>
        )}
      </div>
    </section>
  );
}
