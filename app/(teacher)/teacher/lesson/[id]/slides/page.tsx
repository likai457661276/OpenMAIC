import { TeacherPlaceholder } from '@/components/teacher/teacher-placeholder';

interface SlidesPageProps {
  params: Promise<{ id: string }>;
}

export default async function LessonSlidesPage({ params }: SlidesPageProps) {
  const { id } = await params;

  return (
    <TeacherPlaceholder
      title="课件预览"
      description={`教案 ${id} 的课件预览路由已创建，后续会接入 Slide 生成与编辑能力。`}
      actionHref={`/teacher/lesson/${id}`}
      actionLabel="返回教案"
    />
  );
}
