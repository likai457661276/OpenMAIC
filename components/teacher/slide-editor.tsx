'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiPath } from '@/lib/app-paths';
import { SlideNotesEditor } from '@/components/teacher/slide-notes-editor';
import { SlidePresenter } from '@/components/teacher/slide-presenter';
import { SlidePreviewPanel } from '@/components/teacher/slide-preview-panel';
import { SlideThumbnail } from '@/components/teacher/slide-thumbnail';
import { SlideToolbar } from '@/components/teacher/slide-toolbar';
import type { PPTTextElement } from '@/lib/types/slides';
import type { TeacherSlide, TeacherSlideSet } from '@/lib/teacher/types';

function cloneSlide(slide: TeacherSlide): TeacherSlide {
  return {
    ...structuredClone(slide),
    id: crypto.randomUUID(),
    content: {
      ...structuredClone(slide.content),
      id: crypto.randomUUID(),
      elements: slide.content.elements.map((element) => ({
        ...structuredClone(element),
        id: crypto.randomUUID(),
      })),
    },
  };
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setFirstTextElement(slide: TeacherSlide, title: string): TeacherSlide {
  return {
    ...slide,
    title,
    content: {
      ...slide.content,
      elements: slide.content.elements.map((element, index) => {
        if (index !== 0 || element.type !== 'text') return element;
        const text = element as PPTTextElement;
        return {
          ...text,
          content: `<p><span style="font-size:42px;color:${text.defaultColor};font-weight:700;">${escapeHtml(title)}</span></p>`,
        };
      }),
    },
  };
}

function reorder(slides: TeacherSlide[]): TeacherSlide[] {
  return slides.map((slide, index) => ({ ...slide, order: index + 1 }));
}

export function TeacherSlideEditor({ slideSet }: { readonly slideSet: TeacherSlideSet }) {
  const router = useRouter();
  const [slides, setSlides] = useState<TeacherSlide[]>(slideSet.slides);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const activeSlide = slides[activeIndex];

  const totalDuration = useMemo(
    () => slides.reduce((sum, slide) => sum + (slide.duration || 0), 0),
    [slides],
  );

  function updateActive(patch: Partial<TeacherSlide>) {
    setSlides((current) =>
      current.map((slide, index) => (index === activeIndex ? { ...slide, ...patch } : slide)),
    );
  }

  function updateTitle(title: string) {
    setSlides((current) =>
      current.map((slide, index) =>
        index === activeIndex ? setFirstTextElement(slide, title) : slide,
      ),
    );
  }

  function moveSlide(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= slides.length) return;
    setSlides((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return reorder(next);
    });
    setActiveIndex(target);
  }

  function duplicateSlide(index: number) {
    setSlides((current) => {
      const next = [...current];
      next.splice(index + 1, 0, cloneSlide(current[index]));
      return reorder(next);
    });
    setActiveIndex(index + 1);
  }

  function deleteSlide(index: number) {
    if (slides.length <= 1) {
      toast.error('至少保留一页');
      return;
    }
    setSlides((current) => reorder(current.filter((_, itemIndex) => itemIndex !== index)));
    setActiveIndex((current) => Math.max(0, Math.min(current, slides.length - 2)));
  }

  function addSlide() {
    const source = activeSlide || slides[0];
    const next = setFirstTextElement(cloneSlide(source), '新幻灯片');
    next.notes = '';
    setSlides((current) => reorder([...current, next]));
    setActiveIndex(slides.length);
  }

  async function save() {
    setPending(true);
    try {
      const response = await fetch(apiPath(`/api/teacher/lessons/${slideSet.lessonId}/slides`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slides: reorder(slides), style: slideSet.style }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || '保存课件失败');
      toast.success('课件已保存');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存课件失败');
    } finally {
      setPending(false);
    }
  }

  if (!activeSlide) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="grid content-start gap-2">
        {slides.map((slide, index) => (
          <SlideThumbnail
            key={slide.id}
            slide={slide}
            active={index === activeIndex}
            onSelect={() => setActiveIndex(index)}
            onMove={(direction) => moveSlide(index, direction)}
            onDuplicate={() => duplicateSlide(index)}
            onDelete={() => deleteSlide(index)}
          />
        ))}
      </aside>
      <main className="grid min-w-0 gap-4">
        <SlideToolbar
          index={activeIndex}
          count={slides.length}
          pending={pending}
          exportHref={`/teacher/lesson/${slideSet.lessonId}/export`}
          onPrev={() => setActiveIndex((current) => Math.max(0, current - 1))}
          onNext={() => setActiveIndex((current) => Math.min(slides.length - 1, current + 1))}
          onAdd={addSlide}
          onSave={save}
          onPresent={() => setPresenting(true)}
        />
        <SlidePreviewPanel slide={activeSlide} />
        <div className="grid gap-4 rounded-lg border border-border bg-background p-4 md:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-2">
            <Label htmlFor="slide-title">页面标题</Label>
            <Input
              id="slide-title"
              value={activeSlide.title}
              onChange={(event) => updateTitle(event.target.value)}
            />
            <div className="text-sm text-muted-foreground">预计讲授 {totalDuration} 分钟</div>
          </div>
          <SlideNotesEditor
            value={activeSlide.notes || ''}
            onChange={(notes) => updateActive({ notes })}
          />
        </div>
      </main>
      {presenting ? (
        <SlidePresenter
          slides={slides}
          initialIndex={activeIndex}
          onClose={() => setPresenting(false)}
        />
      ) : null}
    </div>
  );
}
