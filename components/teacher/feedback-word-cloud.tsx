export function FeedbackWordCloud({ words }: { readonly words: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {words.map((word, index) => (
        <span key={`${word}-${index}`} className="rounded-full bg-muted px-3 py-1 text-sm">
          {word}
        </span>
      ))}
    </div>
  );
}
