'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ThumbnailSlide } from '@/components/slide-renderer/components/ThumbnailSlide';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { TeacherSlide } from '@/lib/teacher/types';
import { cn } from '@/lib/utils';
import { Maximize2, Minimize2 } from 'lucide-react';

export function SlidePreviewPanel({ slide }: { readonly slide: TeacherSlide }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenSize, setFullscreenSize] = useState(820);
  const viewportRatio = slide.content.viewportRatio;
  const fullscreenLabel = isFullscreen ? '退出最大化' : '最大化显示';

  const updateFullscreenSize = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const availableWidth = Math.max(320, panel.clientWidth - 64);
    const availableHeight = Math.max(240, panel.clientHeight - 64);
    const nextSize = Math.floor(Math.min(availableWidth, availableHeight / viewportRatio));
    setFullscreenSize(Math.max(320, nextSize));
  }, [viewportRatio]);

  useEffect(() => {
    function handleFullscreenChange() {
      const active = document.fullscreenElement === panelRef.current;
      setIsFullscreen(active);
      if (active) requestAnimationFrame(updateFullscreenSize);
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [updateFullscreenSize]);

  useEffect(() => {
    if (!isFullscreen) return;

    updateFullscreenSize();
    window.addEventListener('resize', updateFullscreenSize);

    const panel = panelRef.current;
    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateFullscreenSize);
    if (panel) resizeObserver?.observe(panel);

    return () => {
      window.removeEventListener('resize', updateFullscreenSize);
      resizeObserver?.disconnect();
    };
  }, [isFullscreen, updateFullscreenSize]);

  async function toggleFullscreen() {
    const panel = panelRef.current;
    if (!panel) return;

    try {
      if (document.fullscreenElement === panel) {
        await document.exitFullscreen();
        return;
      }

      await panel.requestFullscreen();
    } catch {
      console.warn('[TeacherSlidePreview] Fullscreen request denied by browser policy');
    }
  }

  return (
    <div
      ref={panelRef}
      className={cn(
        'relative grid min-h-[360px] place-items-center overflow-auto rounded-lg border border-border bg-muted p-3',
        isFullscreen && 'h-screen w-screen rounded-none border-0 bg-background p-6',
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="absolute right-4 top-4 z-10 bg-background/90 shadow-sm backdrop-blur"
            onClick={toggleFullscreen}
            aria-label={fullscreenLabel}
            title={fullscreenLabel}
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-xs">
          {fullscreenLabel}
        </TooltipContent>
      </Tooltip>
      <div className="shadow-sm ring-1 ring-border">
        <ThumbnailSlide
          slide={slide.content}
          size={isFullscreen ? fullscreenSize : 820}
          viewportSize={slide.content.viewportSize}
          viewportRatio={viewportRatio}
        />
      </div>
    </div>
  );
}
