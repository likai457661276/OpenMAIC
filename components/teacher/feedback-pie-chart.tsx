export function FeedbackPieChart({
  distribution,
}: {
  readonly distribution: Record<string, number>;
}) {
  const total = Object.values(distribution).reduce((sum, value) => sum + value, 0);
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(distribution).map(([label, count]) => (
        <span key={label} className="rounded-md bg-muted px-3 py-2 text-sm">
          {label} · {total ? Math.round((count / total) * 100) : 0}%
        </span>
      ))}
    </div>
  );
}
