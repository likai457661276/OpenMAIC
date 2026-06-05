import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  replaceMediaPlaceholders,
  resolveServerTTSSelection,
} from '@/lib/server/classroom-media-generation';
import type { Scene } from '@/lib/types/stage';

function slideScene(
  elements: Array<{ id: string; type: string; src?: string; mediaRef?: string }>,
) {
  return {
    id: 'scene_1',
    stageId: 'stage_1',
    type: 'slide',
    title: 'Scene',
    order: 1,
    content: {
      type: 'slide',
      canvas: {
        id: 'canvas_1',
        elements,
      },
    },
  } as unknown as Scene;
}

describe('classroom media placeholder replacement', () => {
  test('preserves direct video src when mediaRef is also present', () => {
    const scene = slideScene([
      {
        id: 'video_1',
        type: 'video',
        src: 'https://example.com/direct.mp4',
        mediaRef: 'gen_vid_real123',
      },
    ]);

    replaceMediaPlaceholders([scene], {
      gen_vid_real123: 'https://cdn.example.com/generated.mp4',
    });

    const content = scene.content as {
      canvas: { elements: Array<{ src?: string }> };
    };
    const video = content.canvas.elements[0];
    expect(video.src).toBe('https://example.com/direct.mp4');
  });
});

describe('server TTS selection for generated classrooms', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test('uses DEFAULT_TTS_PROVIDER and DEFAULT_TTS_VOICE when configured', () => {
    vi.stubEnv('DEFAULT_TTS_PROVIDER', 'doubao-tts');
    vi.stubEnv('DEFAULT_TTS_VOICE', 'zh_male_taocheng_uranus_bigtts');

    expect(
      resolveServerTTSSelection({
        'openai-tts': {},
        'doubao-tts': {},
      }),
    ).toEqual({
      providerId: 'doubao-tts',
      voice: 'zh_male_taocheng_uranus_bigtts',
    });
  });

  test('falls back to the first configured server TTS provider', () => {
    vi.stubEnv('DEFAULT_TTS_PROVIDER', 'missing-tts');
    vi.stubEnv('DEFAULT_TTS_VOICE', 'custom-voice');

    expect(
      resolveServerTTSSelection({
        'doubao-tts': {},
        'openai-tts': {},
      }),
    ).toEqual({
      providerId: 'doubao-tts',
      voice: 'zh_female_vv_uranus_bigtts',
    });
  });

  test('does not select browser-native TTS for server generation', () => {
    expect(
      resolveServerTTSSelection({
        'browser-native-tts': {},
      }),
    ).toBeNull();
  });
});
