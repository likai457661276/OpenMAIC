import { LessonForm } from '@/components/teacher/lesson-form';

export default function CreateLessonPage() {
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6">
      <section className="border-b border-border pb-6">
        <h1 className="text-2xl font-semibold tracking-tight">创建教案</h1>
      </section>
      <LessonForm />
    </div>
  );
}
