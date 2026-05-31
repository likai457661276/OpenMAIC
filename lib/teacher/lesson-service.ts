import { promises as fs } from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import { writeJsonFileAtomic } from '@/lib/server/classroom-storage';
import type {
  CreateLessonInput,
  LessonPlan,
  LessonStatus,
  TeachingPhase,
  UpdateLessonInput,
} from '@/lib/teacher/types';

export const TEACHER_DATA_DIR = path.join(process.cwd(), 'data', 'teacher');
export const TEACHER_LESSONS_DIR = path.join(TEACHER_DATA_DIR, 'lessons');

const DEFAULT_DURATION = 45;

function lessonFilePath(id: string) {
  return path.join(TEACHER_LESSONS_DIR, `${id}.json`);
}

export function isValidTeacherResourceId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

async function ensureTeacherLessonsDir() {
  await fs.mkdir(TEACHER_LESSONS_DIR, { recursive: true });
}

function normalizeLines(value?: string[] | string): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter(Boolean);
  }
  return value
    .split(/\r?\n|[；;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function distributeDuration(total: number, weights: number[]): number[] {
  const base = weights.map((weight) => Math.max(5, Math.round(total * weight)));
  const diff = total - base.reduce((sum, item) => sum + item, 0);
  base[base.length - 1] += diff;
  return base;
}

function buildTeachingProcess(input: CreateLessonInput): TeachingPhase[] {
  const duration = input.duration || DEFAULT_DURATION;
  const [intro, inquiry, practice, summary] = distributeDuration(duration, [0.15, 0.4, 0.3, 0.15]);
  const topic = input.topic.trim();

  return [
    {
      name: '情境导入',
      duration: intro,
      teacherActivity: `围绕“${topic}”创设真实问题情境，唤起学生已有经验并明确本课学习任务。`,
      studentActivity: '观察情境材料，提出已有认识与疑问，形成待解决的问题。',
      designIntent: '用问题驱动学习，让学生带着目标进入新知建构。',
      resources: ['导入问题', '板书提纲'],
    },
    {
      name: '新知探究',
      duration: inquiry,
      teacherActivity: `组织学生分步分析${topic}的关键概念、方法和易错点，适时追问并归纳规律。`,
      studentActivity: '独立思考后开展小组讨论，记录推理过程并展示观点。',
      designIntent: '突出概念形成过程，兼顾知识理解与思维方法训练。',
      resources: ['探究任务单', '示例材料'],
    },
    {
      name: '巩固应用',
      duration: practice,
      teacherActivity: '提供分层练习与应用任务，针对共性错误进行即时反馈。',
      studentActivity: '完成基础练习、迁移任务和同伴互评，修正自己的理解。',
      designIntent: '通过练习与迁移检测学习效果，帮助学生从会听走向会用。',
      resources: ['课堂练习', '评价量表'],
    },
    {
      name: '总结提升',
      duration: summary,
      teacherActivity: '引导学生回顾本课核心问题，梳理知识结构并布置延伸任务。',
      studentActivity: '用自己的话总结收获，提出仍需澄清的问题。',
      designIntent: '形成结构化认知，为课后作业与后续学习建立衔接。',
      resources: ['总结板书', '课后任务'],
    },
  ];
}

export function createLessonPlanFromInput(input: CreateLessonInput): LessonPlan {
  const now = new Date().toISOString();
  const objectives = normalizeLines(input.objectives);
  const topic = input.topic.trim();

  return {
    id: nanoid(10),
    title: topic,
    subject: input.subject.trim(),
    grade: input.grade.trim(),
    duration: input.duration || DEFAULT_DURATION,
    createdAt: now,
    updatedAt: now,
    status: 'generated',
    objectives:
      objectives.length > 0
        ? objectives
        : [
            `理解${topic}的核心概念与基本方法。`,
            `能够在典型情境中应用${topic}解决问题。`,
            '通过讨论、表达和反思发展学科思维与合作能力。',
          ],
    keyPoints: [`${topic}的核心概念`, `${topic}的基本方法与应用路径`],
    difficulties: [`学生对${topic}抽象关系的理解`, '从例题迁移到真实问题时的思路选择'],
    teachingProcess: buildTeachingProcess(input),
    homework: `完成与“${topic}”相关的基础巩固题，并任选一个真实情境说明本课知识的应用。`,
    reflection: '课后记录学生在概念理解、活动参与和迁移应用中的表现，为下一课调整任务难度。',
    style: input.style,
    additionalRequirements: input.additionalRequirements?.trim() || undefined,
  };
}

export async function listTeacherLessons(filters?: {
  subject?: string;
  grade?: string;
  page?: number;
  limit?: number;
}): Promise<{ lessons: LessonPlan[]; total: number }> {
  await ensureTeacherLessonsDir();
  const entries = await fs.readdir(TEACHER_LESSONS_DIR, { withFileTypes: true });
  const lessons = (
    await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
        .map(async (entry) => {
          const content = await fs.readFile(path.join(TEACHER_LESSONS_DIR, entry.name), 'utf-8');
          return JSON.parse(content) as LessonPlan;
        }),
    )
  )
    .filter((lesson) => !filters?.subject || lesson.subject === filters.subject)
    .filter((lesson) => !filters?.grade || lesson.grade === filters.grade)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const total = lessons.length;
  const page = Math.max(1, filters?.page || 1);
  const limit = Math.max(1, Math.min(filters?.limit || 50, 100));
  const start = (page - 1) * limit;

  return { lessons: lessons.slice(start, start + limit), total };
}

export async function getTeacherLesson(id: string): Promise<LessonPlan | null> {
  if (!isValidTeacherResourceId(id)) return null;
  try {
    const content = await fs.readFile(lessonFilePath(id), 'utf-8');
    return JSON.parse(content) as LessonPlan;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export async function saveTeacherLesson(lesson: LessonPlan): Promise<LessonPlan> {
  await ensureTeacherLessonsDir();
  const next = { ...lesson, updatedAt: new Date().toISOString() };
  await writeJsonFileAtomic(lessonFilePath(next.id), next);
  return next;
}

export async function createTeacherLesson(input: CreateLessonInput): Promise<LessonPlan> {
  return saveTeacherLesson(createLessonPlanFromInput(input));
}

export async function updateTeacherLesson(
  id: string,
  patch: UpdateLessonInput,
): Promise<LessonPlan | null> {
  const existing = await getTeacherLesson(id);
  if (!existing) return null;

  const nextStatus: LessonStatus =
    patch.status || (existing.status === 'finalized' ? 'finalized' : 'edited');
  return saveTeacherLesson({
    ...existing,
    ...patch,
    id: existing.id,
    createdAt: existing.createdAt,
    status: nextStatus,
  });
}

export async function deleteTeacherLesson(id: string): Promise<boolean> {
  if (!isValidTeacherResourceId(id)) return false;
  try {
    await fs.unlink(lessonFilePath(id));
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}
