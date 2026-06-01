export function FeedbackBarChart({
  distribution,
}: {
  readonly distribution: Record<string, number>;
}) {
  const entries = Object.entries(distribution);
  const max = Math.max(1, ...entries.map(([, count]) => count));
  return (
    <div className="grid gap-2">
      {entries.map(([label, count]) => (
        <div key={label} className="grid gap-1 text-sm">
          <div className="flex justify-between">
            <span>{label}</span>
            <span className="text-muted-foreground">{count}</span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary"
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
