'use client';

import { Copy, GripVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TeacherSlide } from '@/lib/teacher/types';

interface SlideThumbnailProps {
  readonly slide: TeacherSlide;
  readonly active: boolean;
  readonly onSelect: () => void;
  readonly onMove: (direction: -1 | 1) => void;
  readonly onDuplicate: () => void;
  readonly onDelete: () => void;
}

export function SlideThumbnail({
  slide,
  active,
  onSelect,
  onMove,
  onDuplicate,
  onDelete,
}: SlideThumbnailProps) {
  return (
    <div
      className={cn(
        'grid gap-2 rounded-lg border bg-background p-2 text-left transition-colors',
        active
          ? 'border-primary ring-2 ring-primary/20'
          : 'border-border hover:border-foreground/30',
      )}
    >
      <button type="button" onClick={onSelect} className="grid gap-1 text-left">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">#{slide.order}</span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
            {slide.type}
          </span>
        </div>
        <div className="line-clamp-2 text-sm font-medium">{slide.title}</div>
      </button>
      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="icon-sm" onClick={() => onMove(-1)}>
          <GripVertical className="size-4 rotate-90" />
          <span className="sr-only">上移</span>
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" onClick={() => onMove(1)}>
          <GripVertical className="size-4 -rotate-90" />
          <span className="sr-only">下移</span>
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onDuplicate}>
          <Copy className="size-4" />
          <span className="sr-only">复制</span>
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onDelete}>
          <Trash2 className="size-4" />
          <span className="sr-only">删除</span>
        </Button>
      </div>
    </div>
  );
}
