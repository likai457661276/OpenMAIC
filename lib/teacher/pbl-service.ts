import { promises as fs } from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import { writeJsonFileAtomic } from '@/lib/server/classroom-storage';
import { getTeacherLesson, isValidTeacherResourceId, TEACHER_DATA_DIR } from './lesson-service';
import type { LessonPlan, PBLGenerationInput, PBLProject, PBLProjectUpdateInput } from './types';

export interface TeacherPBLProjectSummary {
  id: string;
  title: string;
  taskCount: number;
  status: PBLProject['status'];
  updatedAt: string;
}

const TEACHER_PBL_DIR = path.join(TEACHER_DATA_DIR, 'pbl-projects');

async function ensurePBLDir() {
  await fs.mkdir(TEACHER_PBL_DIR, { recursive: true });
}

function pblFilePath(id: string) {
  return path.join(TEACHER_PBL_DIR, `${id}.json`);
}

function buildProject(lesson: LessonPlan, input: PBLGenerationInput): PBLProject {
  const now = new Date().toISOString();
  const topic = input.topic?.trim() || lesson.title;
  const skills = input.targetSkills?.filter(Boolean).length
    ? input.targetSkills.filter(Boolean)
    : ['问题分析', '合作探究', '成果表达'];
  const taskCount = Math.max(2, Math.min(input.issueCount || 4, 8));
  const tasks = Array.from({ length: taskCount }, (_, index) => {
    const phase = lesson.teachingProcess[index % lesson.teachingProcess.length];
    return {
      id: nanoid(10),
      order: index + 1,
      title: `${phase?.name || '项目任务'} ${index + 1}`,
      description: `围绕“${topic}”完成${phase?.studentActivity || '资料收集、分析和展示'}。`,
      type: index % 2 === 0 ? ('group' as const) : ('individual' as const),
      duration: `${Math.max(1, Math.round(lesson.duration / taskCount))}分钟`,
      expectedOutcome: `形成与“${topic}”相关的阶段性证据、方案或展示材料。`,
    };
  });

  return {
    id: nanoid(10),
    lessonId: lesson.id,
    title: `${topic} 项目式学习`,
    background: `本项目基于${lesson.grade}${lesson.subject}《${lesson.title}》，引导学生在真实问题中应用课堂知识。`,
    drivingQuestion: `如何运用“${topic}”解决一个贴近生活或学科实践的真实问题？`,
    objectives: [...lesson.objectives, ...skills.map((skill) => `发展${skill}能力。`)],
    tasks,
    timeline: lesson.teachingProcess.map((phase, index) => ({
      id: nanoid(10),
      order: index + 1,
      name: phase.name,
      duration: `${phase.duration}分钟`,
      activities: [phase.teacherActivity, phase.studentActivity],
      milestones: [phase.designIntent],
    })),
    teacherGuidance:
      '教师重点关注问题定义、资料证据、协作分工与成果表达质量，适时提供追问和脚手架。',
    studentDeliverables: ['项目方案说明', '小组展示材料', '个人学习反思'],
    evaluationCriteria: {
      totalScore: 100,
      dimensions: [
        {
          name: '问题理解',
          weight: 30,
          levels: [
            { level: '优秀', score: 30, description: '能准确界定问题并关联核心知识。' },
            { level: '良好', score: 24, description: '能说明主要问题和基本知识联系。' },
            { level: '合格', score: 18, description: '问题描述基本清楚，但证据不足。' },
          ],
        },
        {
          name: '方案与协作',
          weight: 40,
          levels: [
            { level: '优秀', score: 40, description: '方案完整，分工清晰，过程证据充分。' },
            { level: '良好', score: 32, description: '方案可执行，协作记录较完整。' },
            { level: '合格', score: 24, description: '方案基本成形，协作过程有待加强。' },
          ],
        },
        {
          name: '表达反思',
          weight: 30,
          levels: [
            { level: '优秀', score: 30, description: '表达清晰，能反思改进路径。' },
            { level: '良好', score: 24, description: '表达较完整，有基本反思。' },
            { level: '合格', score: 18, description: '能完成展示，但反思较简单。' },
          ],
        },
      ],
    },
    resources: ['课堂资料包', '项目任务单', '评价量表', '小组协作记录表'],
    createdAt: now,
    updatedAt: now,
    status: 'draft',
  };
}

export async function listLessonPBLProjects(lessonId: string): Promise<TeacherPBLProjectSummary[]> {
  if (!isValidTeacherResourceId(lessonId)) return [];
  await ensurePBLDir();
  const entries = await fs.readdir(TEACHER_PBL_DIR, { withFileTypes: true });
  const projects = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map(async (entry) => {
        const content = await fs.readFile(path.join(TEACHER_PBL_DIR, entry.name), 'utf-8');
        return JSON.parse(content) as PBLProject;
      }),
  );

  return projects
    .filter((project) => project.lessonId === lessonId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((project) => ({
      id: project.id,
      title: project.title,
      taskCount: project.tasks.length,
      status: project.status,
      updatedAt: project.updatedAt,
    }));
}

export async function getPBLProject(id: string): Promise<PBLProject | null> {
  if (!isValidTeacherResourceId(id)) return null;
  try {
    const content = await fs.readFile(pblFilePath(id), 'utf-8');
    return JSON.parse(content) as PBLProject;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export async function savePBLProject(project: PBLProject): Promise<PBLProject> {
  await ensurePBLDir();
  const next = { ...project, updatedAt: new Date().toISOString() };
  await writeJsonFileAtomic(pblFilePath(next.id), next);
  return next;
}

export async function createPBLProjectFromLesson(input: PBLGenerationInput): Promise<PBLProject> {
  const lesson = await getTeacherLesson(input.lessonId);
  if (!lesson) throw new Error('Lesson not found');
  return savePBLProject(buildProject(lesson, input));
}

export async function updatePBLProject(
  id: string,
  patch: PBLProjectUpdateInput,
): Promise<PBLProject | null> {
  const existing = await getPBLProject(id);
  if (!existing) return null;
  return savePBLProject({
    ...existing,
    ...patch,
    id: existing.id,
    lessonId: existing.lessonId,
    createdAt: existing.createdAt,
  });
}

export async function deletePBLProject(id: string): Promise<boolean> {
  if (!isValidTeacherResourceId(id)) return false;
  try {
    await fs.unlink(pblFilePath(id));
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}
