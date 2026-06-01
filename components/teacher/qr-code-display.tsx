import { Badge } from '@/components/ui/badge';

export function QRCodeDisplay({
  sessionCode,
  joinUrl,
}: {
  readonly sessionCode: string;
  readonly joinUrl: string;
}) {
  return (
    <section className="grid gap-3 rounded-lg border border-border p-4">
      <h2 className="text-base font-semibold">学生入口</h2>
      <div className="grid place-items-center rounded-md border border-dashed border-border p-4">
        <div className="grid size-32 place-items-center rounded-md bg-muted text-center text-xs text-muted-foreground">
          二维码占位
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge>{sessionCode}</Badge>
        <span className="break-all text-muted-foreground">{joinUrl}</span>
      </div>
    </section>
  );
}
