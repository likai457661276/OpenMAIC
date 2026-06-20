import { promises as fs } from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import { writeJsonFileAtomic } from '@/lib/server/classroom-storage';
import { isValidTeacherResourceId, TEACHER_DATA_DIR } from '@/lib/teacher/lesson-service';
import type { LessonPlan } from '@/lib/teacher/types/lesson';
import type {
  SlideGenerationInput,
  TeacherSlide,
  TeacherSlideSet,
  TeacherSlideStyle,
  TeacherSlideType,
  UpdateSlideSetInput,
} from '@/lib/teacher/types/slide';
import type { PPTTextElement, Slide } from '@maic/dsl';

export const TEACHER_SLIDES_DIR = path.join(TEACHER_DATA_DIR, 'slides');

const VIEWPORT_SIZE = 1280;
const VIEWPORT_RATIO = 0.5625;

const STYLE_PALETTE: Record<
  TeacherSlideStyle,
  { background: string; accent: string; accentSoft: string; font: string }
> = {
  professional: {
    background: '#f8fafc',
    accent: '#2563eb',
    accentSoft: '#dbeafe',
    font: '#0f172a',
  },
  casual: {
    background: '#fff7ed',
    accent: '#ea580c',
    accentSoft: '#fed7aa',
    font: '#1f2937',
  },
  academic: {
    background: '#f7fee7',
    accent: '#4d7c0f',
    accentSoft: '#d9f99d',
    font: '#1a2e05',
  },
  colorful: {
    background: '#fdf2f8',
    accent: '#db2777',
    accentSoft: '#fbcfe8',
    font: '#312e81',
  },
};

function slideSetFilePath(lessonId: string) {
  return path.join(TEACHER_SLIDES_DIR, `${lessonId}.json`);
}

async function ensureTeacherSlidesDir() {
  await fs.mkdir(TEACHER_SLIDES_DIR, { recursive: true });
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function textElement(
  id: string,
  content: string,
  options: {
    left: number;
    top: number;
    width: number;
    height: number;
    color: string;
    fontSize: number;
    bold?: boolean;
    fill?: string;
  },
): PPTTextElement {
  return {
    id,
    type: 'text',
    left: options.left,
    top: options.top,
    width: options.width,
    height: options.height,
    rotate: 0,
    content: `<p><span style="font-size:${options.fontSize}px;color:${options.color};font-weight:${options.bold ? 700 : 400};">${escapeHtml(content)}</span></p>`,
    defaultFontName: 'Inter',
    defaultColor: options.color,
    fill: options.fill,
    lineHeight: 1.25,
    paragraphSpace: 4,
  };
}

function bulletText(items: string[]): string {
  return items.map((item) => `• ${item}`).join('\n');
}

function createCanvas(
  title: string,
  body: string[],
  style: TeacherSlideStyle,
  type: Slide['type'] = 'content',
): Slide {
  const palette = STYLE_PALETTE[style];
  return {
    id: nanoid(10),
    viewportSize: VIEWPORT_SIZE,
    viewportRatio: VIEWPORT_RATIO,
    type,
    theme: {
      backgroundColor: palette.background,
      themeColors: [palette.accent, palette.accentSoft, '#ffffff'],
      fontColor: palette.font,
      fontName: 'Inter',
    },
    background: {
      type: 'solid',
      color: palette.background,
    },
    elements: [
      textElement(nanoid(8), title, {
        left: 82,
        top: 68,
        width: 960,
        height: 88,
        color: palette.font,
        fontSize: 42,
        bold: true,
      }),
      textElement(nanoid(8), bulletText(body), {
        left: 96,
        top: 190,
        width: 1000,
        height: 360,
        color: palette.font,
        fontSize: 27,
      }),
      textElement(nanoid(8), 'OpenMAIC Teacher', {
        left: 930,
        top: 648,
        width: 260,
        height: 32,
        color: palette.accent,
        fontSize: 18,
        bold: true,
      }),
    ],
  };
}

function buildSlideSpecs(
  lesson: LessonPlan,
  includeTypes: TeacherSlideType[],
): Array<{ type: TeacherSlideType; title: string; body: string[]; notes: string }> {
  const processItems = lesson.teachingProcess.map(
    (phase) => `${phase.name}（${phase.duration}分钟）：${phase.designIntent}`,
  );
  const specs: Array<{ type: TeacherSlideType; title: string; body: string[]; notes: string }> = [
    {
      type: 'title',
      title: lesson.title,
      body: [`${lesson.grade} ${lesson.subject}`, `建议课时：${lesson.duration} 分钟`],
      notes: '用一个贴近学生经验的问题进入课堂，并说明本节课的学习产出。',
    },
    {
      type: 'bullets',
      title: '教学目标',
      body: lesson.objectives,
      notes: '逐条对齐目标与课堂活动，让学生知道本节课要达成什么。',
    },
    {
      type: 'comparison',
      title: '重点与难点',
      body: [
        ...lesson.keyPoints.map((item) => `重点：${item}`),
        ...lesson.difficulties.map((item) => `难点：${item}`),
      ],
      notes: '重点讲清方法，难点通过例题、追问和同伴解释化解。',
    },
    {
      type: 'content',
      title: '课堂流程',
      body: processItems,
      notes: '按时间推进课堂，注意在探究与练习阶段保留学生表达空间。',
    },
    ...lesson.teachingProcess.map((phase) => ({
      type: 'image-text' as const,
      title: phase.name,
      body: [
        `教师活动：${phase.teacherActivity}`,
        `学生活动：${phase.studentActivity}`,
        `设计意图：${phase.designIntent}`,
      ],
      notes: `本页用于讲解“${phase.name}”，建议控制在 ${phase.duration} 分钟左右。`,
    })),
    {
      type: 'summary',
      title: '总结与作业',
      body: [lesson.homework, lesson.reflection],
      notes: '请学生先总结，再布置作业；教学反思可课后补充。',
    },
  ];

  return specs.filter((spec) => includeTypes.length === 0 || includeTypes.includes(spec.type));
}

export async function getLessonSlideSet(lessonId: string): Promise<TeacherSlideSet | null> {
  if (!isValidTeacherResourceId(lessonId)) return null;
  try {
    const content = await fs.readFile(slideSetFilePath(lessonId), 'utf-8');
    return JSON.parse(content) as TeacherSlideSet;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export async function saveLessonSlideSet(slideSet: TeacherSlideSet): Promise<TeacherSlideSet> {
  await ensureTeacherSlidesDir();
  const slides = slideSet.slides
    .map((slide, index) => ({ ...slide, order: index + 1 }))
    .sort((a, b) => a.order - b.order);
  const next: TeacherSlideSet = {
    ...slideSet,
    slides,
    totalDuration: slides.reduce((sum, slide) => sum + (slide.duration || 0), 0),
    updatedAt: new Date().toISOString(),
  };
  await writeJsonFileAtomic(slideSetFilePath(next.lessonId), next);
  return next;
}

export async function createSlideSetFromLesson(
  lesson: LessonPlan,
  input: Omit<SlideGenerationInput, 'lessonId' | 'lessonPlan'> = {},
): Promise<TeacherSlideSet> {
  const now = new Date().toISOString();
  const style = input.style || 'professional';
  const includeTypes = input.includeTypes || [];
  const specs = buildSlideSpecs(lesson, includeTypes);
  const count = Math.max(1, Math.min(input.slideCount || specs.length, specs.length));
  const slides: TeacherSlide[] = specs.slice(0, count).map((spec, index) => ({
    id: nanoid(10),
    order: index + 1,
    type: spec.type,
    title: spec.title,
    content: createCanvas(
      spec.title,
      spec.body,
      style,
      spec.type === 'title' ? 'cover' : 'content',
    ),
    notes: spec.notes,
    duration: Math.max(3, Math.round(lesson.duration / count)),
  }));

  return saveLessonSlideSet({
    id: nanoid(10),
    lessonId: lesson.id,
    slides,
    totalDuration: slides.reduce((sum, slide) => sum + (slide.duration || 0), 0),
    createdAt: now,
    updatedAt: now,
    style,
  });
}

export async function updateLessonSlideSet(
  lessonId: string,
  input: UpdateSlideSetInput,
): Promise<TeacherSlideSet | null> {
  const existing = await getLessonSlideSet(lessonId);
  if (!existing) return null;
  return saveLessonSlideSet({
    ...existing,
    ...input,
    lessonId: existing.lessonId,
    createdAt: existing.createdAt,
  });
}
