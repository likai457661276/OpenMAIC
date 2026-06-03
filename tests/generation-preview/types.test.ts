import { describe, expect, it } from 'vitest';
import { getActiveSteps, type GenerationSessionState } from '@/app/generation-preview/types';

describe('generation preview steps', () => {
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

    expect(getActiveSteps(session).map((step) => step.id)).toEqual([
      'agent-generation',
      'actions',
    ]);
  });
});
