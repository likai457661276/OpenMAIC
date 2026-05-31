'use client';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function SlideNotesEditor({
  value,
  onChange,
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="slide-notes">教师备注</Label>
      <Textarea
        id="slide-notes"
        rows={5}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
