'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquarePlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiPath } from '@/lib/app-paths';
import type { FeedbackSession, FeedbackSummary, FeedbackType } from '@/lib/teacher/types';
import { FeedbackBarChart } from './feedback-bar-chart';
import { FeedbackWordCloud } from './feedback-word-cloud';

export function FeedbackPanel({
  lessonId,
  sessions,
  summaries,
}: {
  readonly lessonId: string;
  readonly sessions: FeedbackSession[];
  readonly summaries: FeedbackSummary[];
}) {
  const router = useRouter();
  const [type, setType] = useState<FeedbackType>('quick-poll');
  const [question, setQuestion] = useState('你是否理解了当前内容？');

  async function createFeedback() {
    try {
      const response = await fetch(apiPath('/api/teacher/feedback'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, type, question }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || '创建反馈失败');
      toast.success('反馈活动已创建');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '创建反馈失败');
    }
  }

  return (
    <section className="grid gap-4 rounded-lg border border-border p-4">
      <div className="grid gap-3 md:grid-cols-[180px_1fr_auto]">
        <Select value={type} onValueChange={(value) => setType(value as FeedbackType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="quick-poll">快速投票</SelectItem>
            <SelectItem value="understanding">理解度</SelectItem>
            <SelectItem value="emoji-reaction">表情反馈</SelectItem>
            <SelectItem value="free-text">自由反馈</SelectItem>
            <SelectItem value="rating">评分反馈</SelectItem>
          </SelectContent>
        </Select>
        <Input value={question} onChange={(event) => setQuestion(event.target.value)} />
        <Button type="button" onClick={createFeedback}>
          <MessageSquarePlus className="size-4" />
          发起反馈
        </Button>
      </div>
      <div className="grid gap-3">
        {sessions.map((session) => {
          const summary = summaries.find((item) => item.sessionId === session.id);
          return (
            <article key={session.id} className="grid gap-3 rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-medium">{session.question}</h3>
                <span className="text-xs text-muted-foreground">
                  {summary?.totalResponses || 0} 条反馈
                </span>
              </div>
              {summary?.textResponses ? (
                <FeedbackWordCloud words={summary.textResponses} />
              ) : (
                <FeedbackBarChart distribution={summary?.distribution || {}} />
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
