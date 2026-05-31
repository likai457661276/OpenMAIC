export type TeacherExportFormat = 'pptx' | 'resource-pack';

export interface TeacherExportOption {
  format: TeacherExportFormat;
  label: string;
}

export function getTeacherExportOptions(): TeacherExportOption[] {
  return [
    { format: 'pptx', label: 'PPTX' },
    { format: 'resource-pack', label: '资源包' },
  ];
}
