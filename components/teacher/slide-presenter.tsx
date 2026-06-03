'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SlidePreviewPanel } from '@/components/teacher/slide-preview-panel';
import type { TeacherSlide } from '@/lib/teacher/types';

export function SlidePresenter({
  slides,
  initialIndex,
  onClose,
}: {
  readonly slides: TeacherSlide[];
  readonly initialIndex: number;
  readonly onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const slide = slides[index];

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !document.fullscreenElement) onClose();
      if (event.key === 'ArrowRight' || event.key === ' ') {
        setIndex((current) => Math.min(slides.length - 1, current + 1));
      }
      if (event.key === 'ArrowLeft') {
        setIndex((current) => Math.max(0, current - 1));
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, slides.length]);

  if (!slide) return null;

  return (
    <div className="fixed inset-0 z-50 grid grid-rows-[auto_1fr_auto] bg-background p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {index + 1}/{slides.length}
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onClose}>
          <X className="size-4" />
          <span className="sr-only">退出</span>
        </Button>
      </div>
      <div className="grid place-items-center overflow-auto">
        <SlidePreviewPanel slide={slide} />
      </div>
      <div className="mx-auto w-full max-w-4xl rounded-lg border border-border bg-muted p-3 text-sm leading-6">
        {slide.notes || '暂无备注'}
      </div>
    </div>
  );
}
