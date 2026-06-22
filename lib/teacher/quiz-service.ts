import { promises as fs } from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import { writeJsonFileAtomic } from '@/lib/server/classroom-storage';
import { getTeacherLesson, isValidTeacherResourceId, TEACHER_DATA_DIR } from './lesson-service';
import type {
  LessonPlan,
  QuestionType,
  QuizDifficulty,
  QuizGenerationInput,
  QuizOption,
  QuizQuestion,
  QuizSet,
  QuizSetUpdateInput,
} from './types';

export interface TeacherQuizSummary {
  id: string;
  title: string;
  questionCount: number;
  status: QuizSet['status'];
  totalScore: number;
  updatedAt: string;
}

const TEACHER_QUIZZES_DIR = path.join(TEACHER_DATA_DIR, 'quizzes');
const DEFAULT_TYPES: QuestionType[] = [
  'single-choice',
  'multiple-choice',
  'true-false',
  'fill-blank',
  'short-answer',
];

async function ensureQuizDir() {
  await fs.mkdir(TEACHER_QUIZZES_DIR, { recursive: true });
}

function quizFilePath(id: string) {
  return path.join(TEACHER_QUIZZES_DIR, `${id}.json`);
}

function option(label: string, content: string, isCorrect = false): QuizOption {
  return { id: nanoid(8), label, content, isCorrect };
}

function normalizeQuestion(question: QuizQuestion, index: number): QuizQuestion {
  return {
    ...question,
    order: index + 1,
    score: Math.max(1, Number(question.score || 1)),
  };
}

function normalizeAnswer(answer: string | string[]): string[] {
  return (Array.isArray(answer) ? answer : [answer])
    .map((item) => String(item).trim().toLowerCase())
    .filter(Boolean)
    .sort();
}

export function gradeQuizQuestion(
  question: QuizQuestion,
  answer: string | string[],
): { isCorrect: boolean; score: number } {
  const submitted = normalizeAnswer(answer);
  const expected = normalizeAnswer(question.correctAnswer);
  const exact =
    submitted.length === expected.length &&
    submitted.every((item, index) => item === expected[index]);
  const isCorrect = question.type === 'short-answer' ? submitted.join(' ').length >= 8 : exact;

  return { isCorrect, score: isCorrect ? question.score : 0 };
}

function buildQuestion(
  lesson: LessonPlan,
  type: QuestionType,
  index: number,
  difficulty: QuizDifficulty,
): QuizQuestion {
  const keyPoint = lesson.keyPoints[index % Math.max(lesson.keyPoints.length, 1)] || lesson.title;
  const phase = lesson.teachingProcess[index % Math.max(lesson.teachingProcess.length, 1)];
  const stemPrefix = `${lesson.title}：${keyPoint}`;

  if (type === 'multiple-choice') {
    const options = [
      option('A', `围绕“${keyPoint}”说明核心概念`, true),
      option('B', '只记忆结论，不说明应用条件'),
      option('C', '忽略课堂活动中的证据与推理'),
      option('D', `联系“${phase?.name || '课堂活动'}”完成迁移应用`, true),
    ];
    return {
      id: nanoid(10),
      order: index + 1,
      type,
      content: `${stemPrefix}，以下哪些做法有助于达成学习目标？`,
      options,
      correctAnswer: options.filter((item) => item.isCorrect).map((item) => item.label),
      explanation: '应同时关注概念理解和迁移应用，避免只记忆结论。',
      score: 4,
      difficulty,
      knowledgePoint: keyPoint,
    };
  }

  if (type === 'true-false') {
    const options = [option('A', '正确', true), option('B', '错误')];
    return {
      id: nanoid(10),
      order: index + 1,
      type,
      content: `判断：学习“${lesson.title}”时，教师应结合学生已有经验创设问题情境。`,
      options,
      correctAnswer: 'A',
      explanation: '问题情境能唤起已有经验，帮助学生带着目标进入学习。',
      score: 2,
      difficulty,
      knowledgePoint: keyPoint,
    };
  }

  if (type === 'fill-blank') {
    return {
      id: nanoid(10),
      order: index + 1,
      type,
      content: `填空：本课“${lesson.title}”的一个教学重点是____。`,
      correctAnswer: keyPoint,
      explanation: `教案中的重点包括：${lesson.keyPoints.join('、') || keyPoint}。`,
      score: 3,
      difficulty,
      knowledgePoint: keyPoint,
    };
  }

  if (type === 'short-answer') {
    return {
      id: nanoid(10),
      order: index + 1,
      type,
      content: `简答：请结合课堂流程，说明如何帮助学生突破“${lesson.difficulties[0] || keyPoint}”。`,
      correctAnswer: phase?.designIntent || lesson.reflection,
      explanation: '主观题按是否回应难点、是否包含活动设计和反馈策略进行评分。',
      score: 6,
      difficulty,
      knowledgePoint: keyPoint,
    };
  }

  const options = [
    option('A', `${keyPoint}`, true),
    option('B', lesson.difficulties[0] || '与本课无关的干扰项'),
    option('C', '只完成机械记忆'),
    option('D', '跳过课堂探究过程'),
  ];
  return {
    id: nanoid(10),
    order: index + 1,
    type: 'single-choice',
    content: `${stemPrefix}，最符合本课教学重点的是哪一项？`,
    options,
    correctAnswer: 'A',
    explanation: `“${keyPoint}”来自本课教学重点，最符合题意。`,
    score: 3,
    difficulty,
    knowledgePoint: keyPoint,
  };
}

export async function listLessonQuizzes(lessonId: string): Promise<TeacherQuizSummary[]> {
  if (!isValidTeacherResourceId(lessonId)) return [];
  await ensureQuizDir();
  const entries = await fs.readdir(TEACHER_QUIZZES_DIR, { withFileTypes: true });
  const quizzes = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map(async (entry) => {
        const content = await fs.readFile(path.join(TEACHER_QUIZZES_DIR, entry.name), 'utf-8');
        return JSON.parse(content) as QuizSet;
      }),
  );

  return quizzes
    .filter((quiz) => quiz.lessonId === lessonId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((quiz) => ({
      id: quiz.id,
      title: quiz.title,
      questionCount: quiz.questions.length,
      status: quiz.status,
      totalScore: quiz.totalScore,
      updatedAt: quiz.updatedAt,
    }));
}

export async function getQuizSet(id: string): Promise<QuizSet | null> {
  if (!isValidTeacherResourceId(id)) return null;
  try {
    const content = await fs.readFile(quizFilePath(id), 'utf-8');
    return JSON.parse(content) as QuizSet;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export async function saveQuizSet(quizSet: QuizSet): Promise<QuizSet> {
  await ensureQuizDir();
  const questions = quizSet.questions.map(normalizeQuestion);
  const next: QuizSet = {
    ...quizSet,
    questions,
    totalScore: questions.reduce((sum, question) => sum + question.score, 0),
    updatedAt: new Date().toISOString(),
  };
  await writeJsonFileAtomic(quizFilePath(next.id), next);
  return next;
}

export async function createQuizSetFromLesson(input: QuizGenerationInput): Promise<QuizSet> {
  const lesson = input.lessonPlan || (await getTeacherLesson(input.lessonId));
  if (!lesson) throw new Error('Lesson not found');

  const now = new Date().toISOString();
  const count = Math.max(1, Math.min(input.questionCount || 5, 30));
  const types = input.questionTypes?.length ? input.questionTypes : DEFAULT_TYPES;
  const questions = Array.from({ length: count }, (_, index) => {
    const type = types[index % types.length];
    const difficulty =
      input.difficulty === 'mixed' || !input.difficulty ? 'medium' : input.difficulty;
    return buildQuestion(lesson, type, index, difficulty);
  });

  return saveQuizSet({
    id: nanoid(10),
    lessonId: lesson.id,
    title: input.title?.trim() || `${lesson.title} Quiz 测验`,
    description: `基于${lesson.grade}${lesson.subject}《${lesson.title}》自动生成。`,
    questions,
    totalScore: questions.reduce((sum, question) => sum + question.score, 0),
    timeLimit: Math.max(5, Math.ceil(count * 2)),
    createdAt: now,
    updatedAt: now,
    status: 'draft',
  });
}

export async function updateQuizSet(
  id: string,
  patch: QuizSetUpdateInput,
): Promise<QuizSet | null> {
  const existing = await getQuizSet(id);
  if (!existing) return null;
  return saveQuizSet({
    ...existing,
    ...patch,
    id: existing.id,
    lessonId: existing.lessonId,
    createdAt: existing.createdAt,
  });
}

export async function deleteQuizSet(id: string): Promise<boolean> {
  if (!isValidTeacherResourceId(id)) return false;
  try {
    await fs.unlink(quizFilePath(id));
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}
