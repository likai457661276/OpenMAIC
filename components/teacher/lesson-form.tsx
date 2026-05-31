'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { apiPath } from '@/lib/app-paths';

const subjects = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治'];
const grades = [
  '小学一年级',
  '小学二年级',
  '小学三年级',
  '小学四年级',
  '小学五年级',
  '小学六年级',
  '初中一年级',
  '初中二年级',
  '初中三年级',
  '高中一年级',
  '高中二年级',
  '高中三年级',
];
const styles = ['讲授式', '探究式', '合作式', '翻转课堂'];

function splitLines(value: FormDataEntryValue | null): string[] {
  return String(value || '')
    .split(/\r?\n|[；;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function LessonForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const subject = String(formData.get('subject') || '');
    const grade = String(formData.get('grade') || '');
    const topic = String(formData.get('topic') || '').trim();

    if (!subject || !grade || !topic) {
      toast.error('请补充学科、年级和课题');
      return;
    }

    setPending(true);
    try {
      const response = await fetch(apiPath('/api/teacher/generate-lesson'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          grade,
          topic,
          objectives: splitLines(formData.get('objectives')),
          duration: Number(formData.get('duration') || 45),
          style: String(formData.get('style') || ''),
          additionalRequirements: String(formData.get('additionalRequirements') || '').trim(),
          enableImageGeneration: true,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || '生成教案失败');
      }

      toast.success('教案已生成');
      router.push(`/teacher/lesson/${json.lessonId}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '生成教案失败');
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-5 rounded-lg border border-border bg-background p-5 shadow-xs"
    >
      <div className="grid gap-2">
        <Label htmlFor="lesson-topic">课题</Label>
        <Input id="lesson-topic" name="topic" placeholder="例：函数的单调性" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="lesson-subject">学科</Label>
          <Select name="subject">
            <SelectTrigger id="lesson-subject" className="w-full">
              <SelectValue placeholder="选择学科" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((subject) => (
                <SelectItem key={subject} value={subject}>
                  {subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lesson-grade">年级</Label>
          <Select name="grade">
            <SelectTrigger id="lesson-grade" className="w-full">
              <SelectValue placeholder="选择年级" />
            </SelectTrigger>
            <SelectContent>
              {grades.map((grade) => (
                <SelectItem key={grade} value={grade}>
                  {grade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="lesson-duration">课时（分钟）</Label>
          <Input
            id="lesson-duration"
            name="duration"
            type="number"
            min={15}
            max={180}
            defaultValue={45}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lesson-style">教学风格</Label>
          <Select name="style" defaultValue="探究式">
            <SelectTrigger id="lesson-style" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {styles.map((style) => (
                <SelectItem key={style} value={style}>
                  {style}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="lesson-objectives">教学目标</Label>
        <Textarea
          id="lesson-objectives"
          name="objectives"
          rows={4}
          placeholder="每行一个目标，可留空"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="lesson-requirements">补充要求</Label>
        <Textarea
          id="lesson-requirements"
          name="additionalRequirements"
          rows={4}
          placeholder="例：加入分层练习，突出小组讨论"
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          生成教案
        </Button>
      </div>
    </form>
  );
}
