'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight, Download, MonitorPlay, Plus, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SlideToolbar({
  index,
  count,
  pending,
  onPrev,
  onNext,
  onAdd,
  onSave,
  onPresent,
  exportHref,
}: {
  readonly index: number;
  readonly count: number;
  readonly pending: boolean;
  readonly onPrev: () => void;
  readonly onNext: () => void;
  readonly onAdd: () => void;
  readonly onSave: () => void;
  readonly onPresent: () => void;
  readonly exportHref: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background p-2">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onPrev}
          disabled={index === 0}
        >
          <ChevronLeft className="size-4" />
          <span className="sr-only">上一页</span>
        </Button>
        <div className="min-w-16 text-center text-sm text-muted-foreground">
          {index + 1}/{count}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onNext}
          disabled={index >= count - 1}
        >
          <ChevronRight className="size-4" />
          <span className="sr-only">下一页</span>
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={onAdd}>
          <Plus className="size-4" />
          新增
        </Button>
        <Button type="button" variant="outline" onClick={onPresent}>
          <MonitorPlay className="size-4" />
          演示
        </Button>
        <Button asChild variant="outline">
          <Link href={exportHref}>
            <Download className="size-4" />
            导出
          </Link>
        </Button>
        <Button type="button" onClick={onSave} disabled={pending}>
          <Save className="size-4" />
          保存
        </Button>
      </div>
    </div>
  );
}
