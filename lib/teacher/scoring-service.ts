import type {
  Participant,
  ParticipantAnswer,
  QuestionAnalysis,
  QuestionResult,
  QuizQuestion,
  ScoringResult,
  ScoreRange,
  SessionReport,
} from './types';
import { getQuizSet } from './quiz-service';
import { getQuizSession } from './realtime-service';

function normalizeAnswer(answer: string | string[]): string[] {
  return (Array.isArray(answer) ? answer : [answer])
    .map((item) => String(item).trim().toLowerCase())
    .filter(Boolean)
    .sort();
}

export function scoreQuestion(question: QuizQuestion, answer: string | string[]): QuestionResult {
  const submitted = normalizeAnswer(answer);
  const expected = normalizeAnswer(question.correctAnswer);
  const exact =
    submitted.length === expected.length &&
    submitted.every((item, index) => item === expected[index]);
  const isShortAnswer = question.type === 'short-answer';
  const isCorrect = isShortAnswer ? submitted.join(' ').length >= 8 : exact;
  const score = isCorrect ? question.score : 0;

  return {
    questionId: question.id,
    questionType: question.type,
    score,
    maxScore: question.score,
    isCorrect,
    submittedAnswer: answer,
    correctAnswer: question.correctAnswer,
    feedback: isShortAnswer
      ? '主观题已按关键词覆盖度给出辅助评分，建议教师复核。'
      : question.explanation,
    gradingType: isShortAnswer ? 'ai-assisted' : 'auto',
  };
}

export async function scoreParticipant(
  sessionId: string,
  participant: Participant,
): Promise<ScoringResult> {
  const session = await getQuizSession(sessionId);
  if (!session) throw new Error('Session not found');
  const quizSet = await getQuizSet(session.quizSetId);
  if (!quizSet) throw new Error('Quiz not found');

  const answersByQuestion = new Map<string, ParticipantAnswer>(
    participant.answers.map((answer) => [answer.questionId, answer]),
  );
  const questionResults = quizSet.questions.map((question) => {
    const answer = answersByQuestion.get(question.id);
    return scoreQuestion(question, answer?.answer || '');
  });
  const totalScore = questionResults.reduce((sum, result) => sum + result.score, 0);
  const maxScore = questionResults.reduce((sum, result) => sum + result.maxScore, 0);

  return {
    sessionId,
    participantId: participant.id,
    participantName: participant.name,
    totalScore,
    maxScore,
    percentage: maxScore ? Math.round((totalScore / maxScore) * 100) : 0,
    questionResults,
    gradedAt: new Date().toISOString(),
  };
}

function buildDistribution(results: ScoringResult[]): ScoreRange[] {
  const ranges: ScoreRange[] = [
    { label: '0-59', min: 0, max: 59, count: 0 },
    { label: '60-79', min: 60, max: 79, count: 0 },
    { label: '80-100', min: 80, max: 100, count: 0 },
  ];
  for (const result of results) {
    const range = ranges.find(
      (item) => result.percentage >= item.min && result.percentage <= item.max,
    );
    if (range) range.count += 1;
  }
  return ranges;
}

function commonWrongAnswers(answers: ParticipantAnswer[], questionId: string): string[] {
  const counts = new Map<string, number>();
  for (const answer of answers.filter(
    (item) => item.questionId === questionId && !item.isCorrect,
  )) {
    const key = Array.isArray(answer.answer) ? answer.answer.join('、') : answer.answer;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([answer]) => answer);
}

function analyzeQuestions(
  questions: QuizQuestion[],
  participants: Participant[],
): QuestionAnalysis[] {
  const allAnswers = participants.flatMap((participant) => participant.answers);
  return questions.map((question) => {
    const answers = allAnswers.filter((answer) => answer.questionId === question.id);
    const correctCount = answers.filter((answer) => answer.isCorrect).length;
    const averageTime = answers.length
      ? Math.round(answers.reduce((sum, answer) => sum + answer.timeTaken, 0) / answers.length)
      : 0;
    return {
      questionId: question.id,
      content: question.content,
      correctRate: answers.length ? Math.round((correctCount / answers.length) * 100) : 0,
      averageTime,
      commonWrongAnswers: commonWrongAnswers(allAnswers, question.id),
    };
  });
}

export async function buildSessionReport(sessionId: string): Promise<SessionReport> {
  const session = await getQuizSession(sessionId);
  if (!session) throw new Error('Session not found');
  const quizSet = await getQuizSet(session.quizSetId);
  if (!quizSet) throw new Error('Quiz not found');

  const results = await Promise.all(
    session.participants.map((participant) => scoreParticipant(session.id, participant)),
  );
  const scores = results.map((result) => result.totalScore);
  const averageScore = scores.length
    ? Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1))
    : 0;

  return {
    sessionId,
    quizTitle: quizSet.title,
    participantCount: session.participants.length,
    averageScore,
    highestScore: scores.length ? Math.max(...scores) : 0,
    lowestScore: scores.length ? Math.min(...scores) : 0,
    scoreDistribution: buildDistribution(results),
    questionAnalysis: analyzeQuestions(quizSet.questions, session.participants),
    results,
  };
}
