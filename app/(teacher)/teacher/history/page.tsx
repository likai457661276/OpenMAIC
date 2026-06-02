import { TeacherPlaceholder } from '@/components/teacher/teacher-placeholder';

export default function TeacherHistoryPage() {
  return (
    <TeacherPlaceholder
      title="教案历史"
      description="历史列表路由已创建，后续会接入本地或服务端教案记录。"
      actionHref="/teacher"
      actionLabel="生成教案"
    />
  );
}
