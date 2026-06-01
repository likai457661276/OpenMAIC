export function UnderstandingGauge({ value }: { readonly value: number }) {
  const percentage = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold">{value || 0}</span>
        <span className="text-sm text-muted-foreground">/ 5</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
