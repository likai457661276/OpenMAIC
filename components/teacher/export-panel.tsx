'use client';

import { useMemo, useState } from 'react';
import { Download, FileDown, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiPath } from '@/lib/app-paths';
import type { LessonPlan, TeacherSlideSet } from '@/lib/teacher/types';

function getDownloadFileName(response: Response, fallback: string): string {
  const header = response.headers.get('Content-Disposition') || '';
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
  const asciiMatch = header.match(/filename="([^"]+)"/i);
  return asciiMatch?.[1] || fallback;
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function TeacherExportPanel({
  lesson,
  slideSet,
}: {
  readonly lesson: LessonPlan;
  readonly slideSet: TeacherSlideSet;
}) {
  const orderedSlides = useMemo(
    () => slideSet.slides.slice().sort((a, b) => a.order - b.order),
    [slideSet.slides],
  );
  const [format, setFormat] = useState<'pptx' | 'pdf'>('pptx');
  const [fileName, setFileName] = useState(lesson.title);
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    orderedSlides.map((slide) => slide.id),
  );
  const [pending, setPending] = useState(false);

  const selectedCount = selectedIds.length;
  const allSelected = selectedCount === orderedSlides.length;

  function toggleSlide(slideId: string, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) return Array.from(new Set([...current, slideId]));
      if (current.length <= 1) {
        toast.error('至少选择一页课件');
        return current;
      }
      return current.filter((id) => id !== slideId);
    });
  }

  function selectAll() {
    setSelectedIds(orderedSlides.map((slide) => slide.id));
  }

  function invertSelection() {
    const next = orderedSlides
      .filter((slide) => !selectedIds.includes(slide.id))
      .map((slide) => slide.id);
    if (!next.length) {
      toast.error('反选结果为空');
      return;
    }
    setSelectedIds(next);
  }

  async function exportFile() {
    if (!selectedIds.length) {
      toast.error('至少选择一页课件');
      return;
    }

    setPending(true);
    try {
      const response = await fetch(apiPath('/api/teacher/export'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: lesson.id,
          format,
          fileName,
          slideIds: selectedIds,
        }),
      });

      if (!response.ok) {
        const json = await response.json().catch(() => null);
        throw new Error(json?.error || json?.message || '导出失败');
      }

      const blob = await response.blob();
      const downloadName = getDownloadFileName(response, `${fileName || lesson.title}.pptx`);
      triggerDownload(blob, downloadName);
      toast.success('PPTX 已生成');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '导出失败');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-5 rounded-lg border border-border bg-background p-4">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
        <div className="grid gap-2">
          <Label htmlFor="teacher-export-file">文件名</Label>
          <Input
            id="teacher-export-file"
            value={fileName}
            onChange={(event) => setFileName(event.target.value)}
            placeholder={lesson.title}
          />
        </div>
        <div className="grid gap-2">
          <Label>格式</Label>
          <Select value={format} onValueChange={(value) => setFormat(value as 'pptx' | 'pdf')}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pptx">PPTX</SelectItem>
              <SelectItem value="pdf" disabled>
                PDF（后续支持）
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-y border-border py-3">
        <div className="text-sm text-muted-foreground">
          已选择 {selectedCount}/{orderedSlides.length} 页
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={selectAll}
            disabled={allSelected}
          >
            全选
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={invertSelection}>
            <RotateCcw className="size-4" />
            反选
          </Button>
        </div>
      </div>

      <div className="grid gap-2">
        {orderedSlides.map((slide) => (
          <label
            key={slide.id}
            className="flex min-h-12 items-center gap-3 rounded-md border border-border px-3 py-2 text-sm"
          >
            <Checkbox
              checked={selectedIds.includes(slide.id)}
              onCheckedChange={(checked) => toggleSlide(slide.id, checked === true)}
            />
            <span className="w-10 shrink-0 text-muted-foreground">{slide.order}</span>
            <span className="min-w-0 flex-1 truncate">{slide.title}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{slide.type}</span>
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileDown className="size-4" />
          导出内容来自当前已保存课件。
        </div>
        <Button type="button" onClick={exportFile} disabled={pending || !selectedCount}>
          <Download className="size-4" />
          {pending ? '正在导出' : '导出 PPTX'}
        </Button>
      </div>
    </div>
  );
}
