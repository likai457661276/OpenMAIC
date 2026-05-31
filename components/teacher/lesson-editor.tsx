'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, WandSparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiPath } from '@/lib/app-paths';
import type { LessonPlan, TeachingPhase } from '@/lib/teacher/types';

function toLines(items: string[]): string {
  return items.join('\n');
}

function fromLines(value: string): string[] {
  return value
    .split(/\r?\n|[；;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function phasesToText(phases: TeachingPhase[]): string {
  return phases
    .map(
      (phase) =>
        `${phase.name}|${phase.duration}|${phase.teacherActivity}|${phase.studentActivity}|${phase.designIntent}`,
    )
    .join('\n');
}

function textToPhases(value: string): TeachingPhase[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, duration, teacherActivity, studentActivity, designIntent] = line.split('|');
      return {
        name: name?.trim() || '教学环节',
        duration: Number(duration || 5),
        teacherActivity: teacherActivity?.trim() || '',
        studentActivity: studentActivity?.trim() || '',
        designIntent: designIntent?.trim() || '',
      };
    });
}

export function LessonEditor({ lesson }: { readonly lesson: LessonPlan }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [title, setTitle] = useState(lesson.title);
  const [objectives, setObjectives] = useState(toLines(lesson.objectives));
  const [keyPoints, setKeyPoints] = useState(toLines(lesson.keyPoints));
  const [difficulties, setDifficulties] = useState(toLines(lesson.difficulties));
  const [teachingProcess, setTeachingProcess] = useState(phasesToText(lesson.teachingProcess));
  const [homework, setHomework] = useState(lesson.homework);
  const [reflection, setReflection] = useState(lesson.reflection);

  const parsedPhases = useMemo(() => textToPhases(teachingProcess), [teachingProcess]);

  async function save(status = lesson.status === 'finalized' ? 'finalized' : 'edited') {
    setPending(true);
    try {
      const response = await fetch(apiPath(`/api/teacher/lessons/${lesson.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          objectives: fromLines(objectives),
          keyPoints: fromLines(keyPoints),
          difficulties: fromLines(difficulties),
          teachingProcess: parsedPhases,
          homework,
          reflection,
          status,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || '保存失败');
      toast.success(status === 'finalized' ? '教案已定稿' : '教案已保存');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-5 rounded-lg border border-border bg-background p-4">
      <div className="grid gap-2">
        <Label htmlFor="lesson-edit-title">课题</Label>
        <Input
          id="lesson-edit-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="lesson-edit-objectives">教学目标</Label>
          <Textarea
            id="lesson-edit-objectives"
            rows={8}
            value={objectives}
            onChange={(event) => setObjectives(event.target.value)}
          />
        </div>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="lesson-edit-key-points">教学重点</Label>
            <Textarea
              id="lesson-edit-key-points"
              rows={3}
              value={keyPoints}
              onChange={(event) => setKeyPoints(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lesson-edit-difficulties">教学难点</Label>
            <Textarea
              id="lesson-edit-difficulties"
              rows={3}
              value={difficulties}
              onChange={(event) => setDifficulties(event.target.value)}
            />
          </div>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="lesson-edit-process">教学流程</Label>
        <Textarea
          id="lesson-edit-process"
          rows={8}
          value={teachingProcess}
          onChange={(event) => setTeachingProcess(event.target.value)}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="lesson-edit-homework">作业设计</Label>
          <Textarea
            id="lesson-edit-homework"
            rows={4}
            value={homework}
            onChange={(event) => setHomework(event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lesson-edit-reflection">教学反思</Label>
          <Textarea
            id="lesson-edit-reflection"
            rows={4}
            value={reflection}
            onChange={(event) => setReflection(event.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => save('finalized')} disabled={pending}>
          <WandSparkles className="size-4" />
          定稿
        </Button>
        <Button onClick={() => save()} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          保存
        </Button>
      </div>
    </div>
  );
}
