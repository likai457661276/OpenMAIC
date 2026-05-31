'use client';

import { ThumbnailSlide } from '@/components/slide-renderer/components/ThumbnailSlide';
import type { TeacherSlide } from '@/lib/teacher/types';

export function SlidePreviewPanel({ slide }: { readonly slide: TeacherSlide }) {
  return (
    <div className="grid min-h-[360px] place-items-center overflow-auto rounded-lg border border-border bg-muted p-3">
      <div className="shadow-sm ring-1 ring-border">
        <ThumbnailSlide
          slide={slide.content}
          size={820}
          viewportSize={slide.content.viewportSize}
          viewportRatio={slide.content.viewportRatio}
        />
      </div>
    </div>
  );
}
