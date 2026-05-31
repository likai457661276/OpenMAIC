import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export function LessonForm() {
  return (
    <form className="grid gap-4 rounded-lg border border-border bg-background p-4 shadow-xs">
      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor="lesson-title">
          教案标题
        </label>
        <Input id="lesson-title" name="title" placeholder="例：函数的单调性" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="lesson-subject">
            学科
          </label>
          <Input id="lesson-subject" name="subject" placeholder="例：数学" />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="lesson-grade">
            年级
          </label>
          <Input id="lesson-grade" name="gradeLevel" placeholder="例：高一" />
        </div>
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor="lesson-objectives">
          教学目标
        </label>
        <Textarea id="lesson-objectives" name="objectives" rows={5} />
      </div>
      <div className="flex justify-end">
        <Button type="button">保存草稿</Button>
      </div>
    </form>
  );
}
