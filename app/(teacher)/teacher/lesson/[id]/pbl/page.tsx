import { TeacherPlaceholder } from '@/components/teacher/teacher-placeholder';

interface PBLPageProps {
  params: Promise<{ id: string }>;
}

export default async function LessonPBLPage({ params }: PBLPageProps) {
  const { id } = await params;

  return (
    <TeacherPlaceholder
      title="PBL 管理"
      description={`教案 ${id} 的 PBL 管理路由已创建，后续会接入项目式学习内容。`}
      actionHref={`/teacher/lesson/${id}`}
      actionLabel="返回教案"
    />
  );
}
