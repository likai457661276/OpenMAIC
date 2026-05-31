'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Presentation } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { apiPath } from '@/lib/app-paths';
import type { LessonPlan, TeacherSlideStyle, TeacherSlideType } from '@/lib/teacher/types';

const styleOptions: Array<{ value: TeacherSlideStyle; label: string }> = [
  { value: 'professional', label: '专业' },
  { value: 'academic', label: '学术' },
  { value: 'casual', label: '轻快' },
  { value: 'colorful', label: '活泼' },
];

const typeOptions: Array<{ value: TeacherSlideType; label: string }> = [
  { value: 'title', label: '封面' },
  { value: 'bullets', label: '目标' },
  { value: 'comparison', label: '重点难点' },
  { value: 'content', label: '流程' },
  { value: 'image-text', label: '活动页' },
  { value: 'summary', label: '总结' },
];

export function SlideConfigDialog({ lesson }: { readonly lesson: LessonPlan }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [slideCount, setSlideCount] = useState(8);
  const [style, setStyle] = useState<TeacherSlideStyle>('professional');
  const [includeTypes, setIncludeTypes] = useState<TeacherSlideType[]>(
    typeOptions.map((item) => item.value),
  );

  function toggleType(type: TeacherSlideType, checked: boolean) {
    setIncludeTypes((current) =>
      checked ? [...new Set([...current, type])] : current.filter((item) => item !== type),
    );
  }

  async function generateSlides() {
    setPending(true);
    try {
      const response = await fetch(apiPath('/api/teacher/generate-slides'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          topic: lesson.title,
          slideCount,
          style,
          includeTypes,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || '生成课件失败');
      toast.success('课件已生成');
      setOpen(false);
      router.push(`/teacher/lesson/${lesson.id}/slides`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '生成课件失败');
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Presentation className="size-4" />
          生成课件
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>课件参数</DialogTitle>
          <DialogDescription>{lesson.title}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-5">
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>幻灯片数量</Label>
              <span className="text-sm text-muted-foreground">{slideCount} 页</span>
            </div>
            <Slider
              value={[slideCount]}
              min={3}
              max={12}
              step={1}
              onValueChange={(value) => setSlideCount(value[0] || 8)}
            />
          </div>
          <div className="grid gap-2">
            <Label>课件风格</Label>
            <Select value={style} onValueChange={(value) => setStyle(value as TeacherSlideStyle)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {styleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3">
            <Label>内容类型</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {typeOptions.map((option) => (
                <label key={option.value} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={includeTypes.includes(option.value)}
                    onCheckedChange={(checked) => toggleType(option.value, checked === true)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={generateSlides} disabled={pending || includeTypes.length === 0}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Presentation className="size-4" />
            )}
            开始生成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
