import { promises as fs } from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import { writeJsonFileAtomic } from '@/lib/server/classroom-storage';
import { isValidTeacherResourceId, TEACHER_DATA_DIR } from './lesson-service';
import type {
  ClassroomFeedbackReport,
  CreateFeedbackInput,
  FeedbackResponse,
  FeedbackSession,
  FeedbackSummary,
} from './types';

const TEACHER_FEEDBACK_DIR = path.join(TEACHER_DATA_DIR, 'feedback');

async function ensureFeedbackDir() {
  await fs.mkdir(TEACHER_FEEDBACK_DIR, { recursive: true });
}

function feedbackFilePath(id: string) {
  return path.join(TEACHER_FEEDBACK_DIR, `${id}.json`);
}

export async function createFeedbackSession(input: CreateFeedbackInput): Promise<FeedbackSession> {
  const now = new Date().toISOString();
  const session: FeedbackSession = {
    id: nanoid(10),
    lessonId: input.lessonId,
    type: input.type,
    question: input.question.trim() || '请提交你的课堂反馈',
    responses: [],
    createdAt: now,
    status: 'active',
  };
  return saveFeedbackSession(session);
}

export async function getFeedbackSession(id: string): Promise<FeedbackSession | null> {
  if (!isValidTeacherResourceId(id)) return null;
  try {
    const content = await fs.readFile(feedbackFilePath(id), 'utf-8');
    return JSON.parse(content) as FeedbackSession;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export async function saveFeedbackSession(session: FeedbackSession): Promise<FeedbackSession> {
  await ensureFeedbackDir();
  await writeJsonFileAtomic(feedbackFilePath(session.id), session);
  return session;
}

export async function listLessonFeedbackSessions(lessonId: string): Promise<FeedbackSession[]> {
  if (!isValidTeacherResourceId(lessonId)) return [];
  await ensureFeedbackDir();
  const entries = await fs.readdir(TEACHER_FEEDBACK_DIR, { withFileTypes: true });
  const sessions = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map(async (entry) => {
        const content = await fs.readFile(path.join(TEACHER_FEEDBACK_DIR, entry.name), 'utf-8');
        return JSON.parse(content) as FeedbackSession;
      }),
  );
  return sessions
    .filter((session) => session.lessonId === lessonId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function submitFeedbackResponse(
  sessionId: string,
  response: Omit<FeedbackResponse, 'submittedAt'>,
): Promise<FeedbackSession> {
  const session = await getFeedbackSession(sessionId);
  if (!session) throw new Error('Feedback session not found');
  if (session.status === 'closed') throw new Error('Feedback session is closed');
  const nextResponse: FeedbackResponse = {
    ...response,
    participantName: response.participantName || '匿名学生',
    submittedAt: new Date().toISOString(),
  };
  return saveFeedbackSession({
    ...session,
    responses: [
      ...session.responses.filter((item) => item.participantId !== response.participantId),
      nextResponse,
    ],
  });
}

export async function closeFeedbackSession(id: string): Promise<FeedbackSession | null> {
  const session = await getFeedbackSession(id);
  if (!session) return null;
  return saveFeedbackSession({
    ...session,
    status: 'closed',
    closedAt: new Date().toISOString(),
  });
}

export function summarizeFeedback(session: FeedbackSession): FeedbackSummary {
  const distribution = session.responses.reduce<Record<string, number>>((acc, response) => {
    const key = String(response.value);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const numericValues = session.responses
    .map((response) => Number(response.value))
    .filter((value) => Number.isFinite(value));
  return {
    sessionId: session.id,
    totalResponses: session.responses.length,
    distribution,
    averageRating: numericValues.length
      ? Number(
          (numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length).toFixed(1),
        )
      : undefined,
    textResponses:
      session.type === 'free-text'
        ? session.responses.map((response) => String(response.value))
        : undefined,
  };
}

export async function buildFeedbackReport(lessonId: string): Promise<ClassroomFeedbackReport> {
  const sessions = await listLessonFeedbackSessions(lessonId);
  const understandingSessions = sessions.filter((session) => session.type === 'understanding');
  const understandingValues = understandingSessions.flatMap((session) =>
    session.responses
      .map((response) => Number(response.value))
      .filter((value) => Number.isFinite(value)),
  );
  const totalResponses = sessions.reduce((sum, session) => sum + session.responses.length, 0);
  return {
    lessonId,
    feedbackSessions: sessions,
    overallUnderstanding: understandingValues.length
      ? Number(
          (
            understandingValues.reduce((sum, value) => sum + value, 0) / understandingValues.length
          ).toFixed(1),
        )
      : 0,
    participationRate: totalResponses,
    keyInsights: sessions.length
      ? ['已收集课堂反馈，可结合测验结果调整教学节奏。']
      : ['暂无反馈数据。'],
  };
}
