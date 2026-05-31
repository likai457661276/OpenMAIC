import { getTeacherExportOptions } from '@/lib/teacher/export-service';

interface ExportPageProps {
  params: Promise<{ id: string }>;
}

export default async function LessonExportPage({ params }: ExportPageProps) {
  const { id } = await params;
  const options = getTeacherExportOptions();

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6">
      <section className="border-b border-border pb-6">
        <div className="text-sm text-muted-foreground">教案 ID：{id}</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">导出</h1>
      </section>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <div key={option.format} className="rounded-lg border border-border bg-background p-4">
            <h2 className="text-sm font-semibold">{option.label}</h2>
            <p className="mt-2 text-sm text-muted-foreground">导出流程将在后续功能点中接入。</p>
          </div>
        ))}
      </div>
    </div>
  );
}
