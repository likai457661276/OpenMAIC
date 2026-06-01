import { promises as fs } from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import { writeJsonFileAtomic } from '@/lib/server/classroom-storage';
import { isValidTeacherResourceId, TEACHER_DATA_DIR } from './lesson-service';
import { getQuizSet, updateQuizSet } from './quiz-service';
import type {
  CreateQuizSessionInput,
  Participant,
  ParticipantAnswer,
  QuizSession,
  QuizSessionStatus,
  SessionSettings,
} from './types';

const TEACHER_SESSIONS_DIR = path.join(TEACHER_DATA_DIR, 'quiz-sessions');

const DEFAULT_SETTINGS: SessionSettings = {
  showResultsImmediately: true,
  allowLateJoin: true,
  shuffleQuestions: false,
  shuffleOptions: false,
};

async function ensureSessionDir() {
  await fs.mkdir(TEACHER_SESSIONS_DIR, { recursive: true });
}

function sessionFilePath(id: string) {
  return path.join(TEACHER_SESSIONS_DIR, `${id}.json`);
}

function createSessionCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function normalizeAnswer(answer: string | string[]): string[] {
  return (Array.isArray(answer) ? answer : [answer])
    .map((item) => String(item).trim().toLowerCase())
    .filter(Boolean)
    .sort();
}

export async function getQuizSession(id: string): Promise<QuizSession | null> {
  if (!isValidTeacherResourceId(id)) return null;
  try {
    const content = await fs.readFile(sessionFilePath(id), 'utf-8');
    return JSON.parse(content) as QuizSession;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export async function findQuizSessionByCode(sessionCode: string): Promise<QuizSession | null> {
  await ensureSessionDir();
  const entries = await fs.readdir(TEACHER_SESSIONS_DIR, { withFileTypes: true });
  for (const entry of entries.filter((item) => item.isFile() && item.name.endsWith('.json'))) {
    const content = await fs.readFile(path.join(TEACHER_SESSIONS_DIR, entry.name), 'utf-8');
    const session = JSON.parse(content) as QuizSession;
    if (session.sessionCode === sessionCode) return session;
  }
  return null;
}

export async function saveQuizSession(session: QuizSession): Promise<QuizSession> {
  await ensureSessionDir();
  const next = { ...session, updatedAt: new Date().toISOString() };
  await writeJsonFileAtomic(sessionFilePath(next.id), next);
  return next;
}

export async function createQuizSession(input: CreateQuizSessionInput): Promise<QuizSession> {
  const quizSet = await getQuizSet(input.quizSetId);
  if (!quizSet) throw new Error('Quiz not found');
  const now = new Date().toISOString();
  const session: QuizSession = {
    id: nanoid(10),
    quizSetId: input.quizSetId,
    sessionCode: createSessionCode(),
    teacherId: input.teacherId || 'teacher-local',
    status: 'waiting',
    currentQuestionIndex: 0,
    participants: [],
    settings: { ...DEFAULT_SETTINGS, ...input.settings },
    createdAt: now,
    updatedAt: now,
  };
  await updateQuizSet(quizSet.id, { status: 'active' });
  return saveQuizSession(session);
}

export async function updateQuizSessionStatus(
  id: string,
  status: QuizSessionStatus,
): Promise<QuizSession | null> {
  const session = await getQuizSession(id);
  if (!session) return null;
  const now = new Date().toISOString();
  return saveQuizSession({
    ...session,
    status,
    startedAt: status === 'active' && !session.startedAt ? now : session.startedAt,
    endedAt: status === 'completed' ? now : session.endedAt,
  });
}

export async function moveToQuestion(id: string, currentQuestionIndex: number) {
  const session = await getQuizSession(id);
  if (!session) return null;
  return saveQuizSession({
    ...session,
    currentQuestionIndex: Math.max(0, currentQuestionIndex),
  });
}

export async function joinQuizSession(
  sessionIdOrCode: string,
  name: string,
): Promise<{ session: QuizSession; participant: Participant }> {
  const session =
    (await getQuizSession(sessionIdOrCode)) || (await findQuizSessionByCode(sessionIdOrCode));
  if (!session) throw new Error('Session not found');
  if (
    session.status === 'completed' ||
    (!session.settings.allowLateJoin && session.status !== 'waiting')
  ) {
    throw new Error('Session is not accepting participants');
  }

  const participant: Participant = {
    id: nanoid(10),
    name: name.trim() || '学生',
    joinedAt: new Date().toISOString(),
    answers: [],
    totalScore: 0,
  };
  const next = await saveQuizSession({
    ...session,
    participants: [...session.participants, participant],
  });
  return { session: next, participant };
}

export async function submitQuizAnswer(input: {
  sessionId: string;
  participantId: string;
  questionId: string;
  answer: string | string[];
  timeTaken?: number;
}): Promise<{ session: QuizSession; answer: ParticipantAnswer }> {
  const session = await getQuizSession(input.sessionId);
  if (!session) throw new Error('Session not found');
  const quizSet = await getQuizSet(session.quizSetId);
  if (!quizSet) throw new Error('Quiz not found');
  const question = quizSet.questions.find((item) => item.id === input.questionId);
  if (!question) throw new Error('Question not found');

  const submitted = normalizeAnswer(input.answer);
  const expected = normalizeAnswer(question.correctAnswer);
  const isShortAnswer = question.type === 'short-answer';
  const isCorrect =
    isShortAnswer ||
    (submitted.length === expected.length &&
      submitted.every((item, index) => item === expected[index]));
  const answer: ParticipantAnswer = {
    questionId: question.id,
    answer: input.answer,
    isCorrect,
    score: isCorrect ? question.score : 0,
    answeredAt: new Date().toISOString(),
    timeTaken: Math.max(0, Number(input.timeTaken || 0)),
  };

  const participants = session.participants.map((participant) => {
    if (participant.id !== input.participantId) return participant;
    const answers = [
      ...participant.answers.filter((item) => item.questionId !== question.id),
      answer,
    ];
    return {
      ...participant,
      answers,
      totalScore: answers.reduce((sum, item) => sum + item.score, 0),
    };
  });

  const next = await saveQuizSession({ ...session, participants });
  return { session: next, answer };
}
