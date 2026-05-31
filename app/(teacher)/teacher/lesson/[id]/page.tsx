import Link from 'next/link';
import { FileText, Presentation, Puzzle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TeacherPlaceholder } from '@/components/teacher/teacher-placeholder';

interface LessonPageProps {
  params: Promise<{ id: string }>;
}

const lessonSections = [
  { href: 'slides', label: '课件预览', icon: Presentation },
  { href: 'quiz', label: 'Quiz 互动', icon: Sparkles },
  { href: 'pbl', label: 'PBL 管理', icon: Puzzle },
  { href: 'export', label: '导出', icon: FileText },
];

export default async function LessonDetailPage({ params }: LessonPageProps) {
  const { id } = await params;

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <section className="border-b border-border pb-6">
        <div className="text-sm text-muted-foreground">教案 ID：{id}</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">教案详情</h1>
      </section>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {lessonSections.map((item) => (
          <Button key={item.href} asChild variant="outline" className="h-16 justify-start">
            <Link href={`/teacher/lesson/${id}/${item.href}`}>
              <item.icon className="size-4" />
              {item.label}
            </Link>
          </Button>
        ))}
      </div>
      <TeacherPlaceholder
        title="教案编辑区"
        description="详情页路由已经建立，后续会承载教案内容编辑、生成状态和版本管理。"
      />
    </div>
  );
}
