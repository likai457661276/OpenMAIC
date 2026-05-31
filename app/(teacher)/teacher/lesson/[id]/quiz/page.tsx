import { TeacherPlaceholder } from '@/components/teacher/teacher-placeholder';

interface QuizPageProps {
  params: Promise<{ id: string }>;
}

export default async function LessonQuizPage({ params }: QuizPageProps) {
  const { id } = await params;

  return (
    <TeacherPlaceholder
      title="Quiz 互动"
      description={`教案 ${id} 的 Quiz 路由已创建，后续会接入测验生成与课堂互动。`}
      actionHref={`/teacher/lesson/${id}`}
      actionLabel="返回教案"
    />
  );
}
