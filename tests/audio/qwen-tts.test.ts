import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateTTS } from '@/lib/audio/tts-providers';

describe('Qwen TTS', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            output: {
              audio: {
                url: 'https://dashscope-result.example/audio.wav',
              },
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('posts the official Qwen3 TTS payload without unsupported rate parameters', async () => {
    const result = await generateTTS(
      {
        providerId: 'qwen-tts',
        modelId: 'qwen3-tts-flash',
        apiKey: 'sk-qwen',
        voice: 'Cherry',
        speed: 1.5,
      },
      '同学们好',
    );

    const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    const body = JSON.parse(String(init?.body));

    expect(url).toBe(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
    );
    expect(body).toEqual({
      model: 'qwen3-tts-flash',
      input: {
        text: '同学们好',
        voice: 'Cherry',
        language_type: 'Chinese',
      },
    });
    expect(body).not.toHaveProperty('parameters');
    expect(result.format).toBe('wav');
    expect(result.audio).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('accepts a full DashScope generation endpoint as baseUrl without duplicating the path', async () => {
    await generateTTS(
      {
        providerId: 'qwen-tts',
        modelId: 'qwen3-tts-flash',
        apiKey: 'sk-qwen',
        baseUrl: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
        voice: 'Cherry',
      },
      '你好',
    );

    const [url] = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(url).toBe(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
    );
  });
});
