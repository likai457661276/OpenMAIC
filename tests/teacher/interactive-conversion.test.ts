import { describe, expect, it } from 'vitest';
import {
  ensureTeacherInteractiveSpeechAction,
  getTeacherInteractiveTTSBlockReason,
} from '@/lib/teacher/interactive-conversion';
import type { Action } from '@/lib/types/action';
import type { Scene } from '@/lib/types/stage';

function slideScene(actions: Action[] = []): Scene {
  return {
    id: 'scene-1',
    stageId: 'stage-1',
    type: 'slide',
    title: '认识速度',
    order: 1,
    content: {
      type: 'slide',
      canvas: {
        id: 'canvas-1',
        elements: [
          {
            id: 'text-1',
            type: 'text',
            content: '速度表示物体运动的快慢',
          },
        ],
        background: '#ffffff',
      },
    },
    actions,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  } as unknown as Scene;
}

describe('teacher interactive conversion helpers', () => {
  it('inserts fallback speech before discussion when actions have no speech', () => {
    const scene = slideScene([
      {
        id: 'discussion-1',
        type: 'discussion',
        topic: '生活中有哪些速度的例子？',
      },
    ]);

    const result = ensureTeacherInteractiveSpeechAction(scene, () => 'speech-1');

    expect(result.inserted).toBe(true);
    expect(scene.actions?.[0]).toMatchObject({
      id: 'speech-1',
      type: 'speech',
      text: '我们先来看“认识速度”。这一页的重点是：速度表示物体运动的快慢。',
    });
    expect(scene.actions?.[1]).toMatchObject({ type: 'discussion' });
  });

  it('does not duplicate existing speech actions', () => {
    const scene = slideScene([
      { id: 'speech-existing', type: 'speech', text: '同学们，先观察这一页。' },
      { id: 'discussion-1', type: 'discussion', topic: '你发现了什么？' },
    ]);

    const result = ensureTeacherInteractiveSpeechAction(scene, () => 'speech-new');

    expect(result.inserted).toBe(false);
    expect(scene.actions).toHaveLength(2);
    expect(scene.actions?.[0]).toMatchObject({ id: 'speech-existing' });
  });

  it('blocks browser-native TTS because it cannot be exported as audio files', () => {
    expect(
      getTeacherInteractiveTTSBlockReason({
        ttsEnabled: true,
        ttsProviderId: 'browser-native-tts',
        ttsProvidersConfig: { 'browser-native-tts': { enabled: true } },
      }),
    ).toContain('浏览器原生 TTS');
  });

  it('blocks unavailable server TTS providers and allows configured providers', () => {
    expect(
      getTeacherInteractiveTTSBlockReason({
        ttsEnabled: true,
        ttsProviderId: 'openai-tts',
        ttsProvidersConfig: { 'openai-tts': { enabled: true } },
      }),
    ).toContain('TTS provider 未配置或不可用');

    expect(
      getTeacherInteractiveTTSBlockReason({
        ttsEnabled: true,
        ttsProviderId: 'openai-tts',
        ttsProvidersConfig: { 'openai-tts': { isServerConfigured: true, enabled: true } },
      }),
    ).toBeUndefined();
  });
});
