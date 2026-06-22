import { describe, expect, it } from 'vitest';
import {
  createLessonPlanFromInput,
  createTeacherLesson,
  deleteTeacherLesson,
  getTeacherLesson,
  updateTeacherLesson,
} from '@/lib/teacher/lesson-service';
import {
  createSlideSetFromLesson,
  getLessonSlideSet,
  updateLessonSlideSet,
} from '@/lib/teacher/slide-service';
import { exportTeacherSlides } from '@/lib/teacher/export-service';
import { createPBLProjectFromLesson, deletePBLProject } from '@/lib/teacher/pbl-service';
import { createQuizSetFromLesson, deleteQuizSet } from '@/lib/teacher/quiz-service';
import {
  createQuizSession,
  joinQuizSession,
  submitQuizAnswer,
} from '@/lib/teacher/realtime-service';
import { buildSessionReport } from '@/lib/teacher/scoring-service';
import {
  buildFeedbackReport,
  createFeedbackSession,
  submitFeedbackResponse,
} from '@/lib/teacher/feedback-service';

describe('teacher services', () => {
  it('allocates valid phase durations and rejects lessons shorter than 20 minutes', () => {
    const lesson = createLessonPlanFromInput({
      subject: '数学',
      grade: '一年级',
      topic: '认识数字',
      duration: 20,
    });

    expect(lesson.teachingProcess.every((phase) => phase.duration >= 5)).toBe(true);
    expect(lesson.teachingProcess.reduce((sum, phase) => sum + phase.duration, 0)).toBe(20);
    expect(() =>
      createLessonPlanFromInput({
        subject: '数学',
        grade: '一年级',
        topic: '认识数字',
        duration: 10,
      }),
    ).toThrow('at least 20 minutes');
  });

  it('persists and updates a structured lesson plan', async () => {
    const lesson = await createTeacherLesson({
      subject: '数学',
      grade: '高中一年级',
      topic: '函数单调性',
      objectives: ['理解单调性定义'],
      duration: 45,
      style: '探究式',
    });

    expect(lesson.id).toBeTruthy();
    expect(lesson.objectives).toContain('理解单调性定义');

    const updated = await updateTeacherLesson(lesson.id, {
      keyPoints: ['单调区间判断'],
    });
    expect(updated?.status).toBe('edited');
    expect(updated?.keyPoints).toEqual(['单调区间判断']);

    const loaded = await getTeacherLesson(lesson.id);
    expect(loaded?.title).toBe('函数单调性');

    await expect(updateTeacherLesson(lesson.id, { duration: 10 })).rejects.toThrow(
      'at least 20 minutes',
    );

    await deleteTeacherLesson(lesson.id);
  });

  it('creates editable slide sets from lesson plans', async () => {
    const lesson = await createTeacherLesson({
      subject: '物理',
      grade: '初中二年级',
      topic: '牛顿第二定律',
      duration: 40,
    });

    const slideSet = await createSlideSetFromLesson(lesson, {
      slideCount: 4,
      style: 'academic',
    });

    expect(slideSet.slides).toHaveLength(4);
    expect(slideSet.slides[0].content.elements.length).toBeGreaterThan(0);

    const next = await updateLessonSlideSet(lesson.id, {
      slides: slideSet.slides.slice().reverse(),
    });
    expect(next?.slides[0].order).toBe(1);

    const loaded = await getLessonSlideSet(lesson.id);
    expect(loaded?.lessonId).toBe(lesson.id);

    await deleteTeacherLesson(lesson.id);
  });

  it('exports selected teacher slides as a pptx buffer', async () => {
    const lesson = await createTeacherLesson({
      subject: '语文',
      grade: '小学五年级',
      topic: '古诗鉴赏',
      duration: 40,
    });
    const slideSet = await createSlideSetFromLesson(lesson, {
      slideCount: 3,
      style: 'professional',
    });

    const file = await exportTeacherSlides({
      lessonId: lesson.id,
      format: 'pptx',
      slideIds: [slideSet.slides[0].id, slideSet.slides[2].id],
      fileName: '古诗鉴赏课堂',
    });

    expect(file.fileName).toBe('古诗鉴赏课堂.pptx');
    expect(file.slideCount).toBe(2);
    expect(file.mimeType).toContain('presentationml.presentation');
    expect(file.buffer.subarray(0, 2).toString()).toBe('PK');

    await deleteTeacherLesson(lesson.id);
  });

  it('generates quiz, runs a session, scores answers, and collects feedback', async () => {
    const lesson = await createTeacherLesson({
      subject: '数学',
      grade: '初中一年级',
      topic: '有理数加减法',
      duration: 45,
    });

    const quizSet = await createQuizSetFromLesson({
      lessonId: lesson.id,
      questionCount: 3,
      questionTypes: ['single-choice', 'true-false', 'short-answer'],
      difficulty: 'mixed',
    });
    expect(quizSet.questions).toHaveLength(3);
    expect(quizSet.totalScore).toBeGreaterThan(0);

    const session = await createQuizSession({ quizSetId: quizSet.id });
    const joined = await joinQuizSession(session.id, '学生甲');
    const firstQuestion = quizSet.questions[0];
    const answer = Array.isArray(firstQuestion.correctAnswer)
      ? firstQuestion.correctAnswer[0]
      : firstQuestion.correctAnswer;

    await submitQuizAnswer({
      sessionId: session.id,
      participantId: joined.participant.id,
      questionId: firstQuestion.id,
      answer,
      timeTaken: 12,
    });

    const shortAnswerQuestion = quizSet.questions.find(
      (question) => question.type === 'short-answer',
    );
    expect(shortAnswerQuestion).toBeTruthy();
    const emptyShortAnswer = await submitQuizAnswer({
      sessionId: session.id,
      participantId: joined.participant.id,
      questionId: shortAnswerQuestion!.id,
      answer: '',
    });
    expect(emptyShortAnswer.answer).toMatchObject({ isCorrect: false, score: 0 });

    await expect(
      submitQuizAnswer({
        sessionId: session.id,
        participantId: 'missing-participant',
        questionId: firstQuestion.id,
        answer,
      }),
    ).rejects.toThrow('Participant not found');

    const report = await buildSessionReport(session.id);
    expect(report.participantCount).toBe(1);
    expect(report.results[0].totalScore).toBeGreaterThan(0);
    expect(
      report.results[0].questionResults.find(
        (result) => result.questionId === shortAnswerQuestion!.id,
      ),
    ).toMatchObject({ isCorrect: false, score: 0 });

    const feedback = await createFeedbackSession({
      lessonId: lesson.id,
      type: 'understanding',
      question: '理解度如何？',
    });
    await submitFeedbackResponse(feedback.id, {
      participantId: joined.participant.id,
      participantName: joined.participant.name,
      value: 4,
    });
    const feedbackReport = await buildFeedbackReport(lesson.id);
    expect(feedbackReport.overallUnderstanding).toBe(4);

    await deleteQuizSet(quizSet.id);
    await deleteTeacherLesson(lesson.id);
  });

  it('generates a structured PBL project from a lesson', async () => {
    const lesson = await createTeacherLesson({
      subject: '科学',
      grade: '小学六年级',
      topic: '校园节水方案',
      duration: 45,
    });

    const project = await createPBLProjectFromLesson({
      lessonId: lesson.id,
      issueCount: 3,
      targetSkills: ['调查分析', '方案表达'],
    });

    expect(project.tasks).toHaveLength(3);
    expect(project.timeline.length).toBeGreaterThan(0);
    expect(project.evaluationCriteria.totalScore).toBe(100);

    await deletePBLProject(project.id);
    await deleteTeacherLesson(lesson.id);
  });
});
