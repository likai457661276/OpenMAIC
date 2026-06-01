'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { apiPath } from '@/lib/app-paths';
import type { LessonPlan, PBLProject } from '@/lib/teacher/types';

export function PBLProjectPanel({
  lesson,
  initialProject,
}: {
  readonly lesson: LessonPlan;
  readonly initialProject: PBLProject | null;
}) {
  const router = useRouter();
  const [project, setProject] = useState(initialProject);
  const [pending, setPending] = useState(false);

  async function generateProject() {
    setPending(true);
    try {
      const response = await fetch(apiPath('/api/teacher/generate-pbl'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: lesson.id,
          topic: lesson.title,
          issueCount: 4,
          targetSkills: ['问题分析', '小组协作', '成果表达'],
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || '生成 PBL 失败');
      setProject(json.project);
      toast.success('PBL 项目已生成');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '生成 PBL 失败');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4">
      <div>
        <h2 className="text-base font-semibold">{project ? 'PBL 项目已就绪' : '生成 PBL 项目'}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          基于教案生成项目主题、任务、时间轴和评价标准。
        </p>
      </div>
      <Button type="button" onClick={generateProject} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {project ? '重新生成' : '生成 PBL'}
      </Button>
    </div>
  );
}
