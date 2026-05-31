import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TeacherPlaceholderProps {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}

export function TeacherPlaceholder({
  title,
  description,
  actionHref,
  actionLabel,
}: TeacherPlaceholderProps) {
  return (
    <section className="grid gap-4 rounded-lg border border-dashed border-border bg-background p-6">
      <div className="max-w-2xl">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {actionHref && actionLabel && (
        <div>
          <Button asChild variant="outline">
            <Link href={actionHref}>
              {actionLabel}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
}
