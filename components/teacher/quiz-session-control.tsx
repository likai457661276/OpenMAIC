'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pause, Play, Square, StepForward } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { apiPath } from '@/lib/app-paths';
import type { QuizSession, QuizSessionStatus } from '@/lib/teacher/types';

export function QuizSessionControl({ session }: { readonly session: QuizSession }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function update(payload: { status?: QuizSessionStatus; currentQuestionIndex?: number }) {
    setPending(true);
    try {
      const response = await fetch(apiPath(`/api/teacher/quiz-session/${session.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || '更新会话失败');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新会话失败');
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-4">
      <Button type="button" onClick={() => update({ status: 'active' })} disabled={pending}>
        <Play className="size-4" />
        开始
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => update({ status: 'paused' })}
        disabled={pending}
      >
        <Pause className="size-4" />
        暂停
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => update({ currentQuestionIndex: session.currentQuestionIndex + 1 })}
        disabled={pending}
      >
        <StepForward className="size-4" />
        下一题
      </Button>
      <Button
        type="button"
        variant="destructive"
        onClick={() => update({ status: 'completed' })}
        disabled={pending}
      >
        <Square className="size-4" />
        结束
      </Button>
    </section>
  );
}
