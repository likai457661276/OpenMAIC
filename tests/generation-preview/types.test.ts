import { describe, expect, it } from 'vitest';
import {
  getActiveSteps,
  sessionUsesServerModel,
  type GenerationSessionState,
} from '@/app/generation-preview/types';

describe('generation preview steps', () => {
  it('uses server models for automatic sessions, including legacy embedded sessions', () => {
    const session = {
      sessionId: 'session-auto',
      requirements: { requirement: '任意角教案' },
      pdfText: '教案内容',
      currentStep: 'generating',
    } satisfies GenerationSessionState;
    expect(sessionUsesServerModel(session)).toBe(false);
    expect(sessionUsesServerModel({ ...session, useServerModel: true })).toBe(true);
    expect(sessionUsesServerModel({ ...session, autoTeacherEmbedded: true })).toBe(true);
    expect(
      sessionUsesServerModel({
        ...session,
        autoTeacherBridge: {
          enabled: true,
          token: 'test-token',
          uploadUrl: 'https://parent.example.com/upload',
          sourceOrigin: 'https://parent.example.com',
        },
      }),
    ).toBe(true);
  });

  it('uses enrichment-only steps for teacher interactive conversion', () => {
    const session = {
      sessionId: 'session-1',
      requirements: {
        requirement: '把教师课件转换为互动课堂',
        interactiveMode: true,
      },
      pdfText: '',
      currentStep: 'generating',
      teacherMode: true,
      teacherInteractiveConversion: true,
      teacherInteractiveSource: {
        stage: {
          id: 'stage-1',
          name: '教师课件',
          createdAt: 1,
          updatedAt: 1,
          teacherMode: true,
        },
        scenes: [],
      },
    } satisfies GenerationSessionState;

    expect(getActiveSteps(session).map((step) => step.id)).toEqual(['agent-generation', 'actions']);
  });
});
