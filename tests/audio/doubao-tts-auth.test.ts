import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateTTS } from '@/lib/audio/tts-providers';

const okChunkedResponse = [
  JSON.stringify({ code: 0, data: Buffer.from([1, 2, 3]).toString('base64') }),
  JSON.stringify({ code: 20000000, message: 'ok' }),
].join('\n');

describe('Doubao TTS auth headers', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn(async () => new Response(okChunkedResponse, { status: 200 }));
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('uses old-console App ID and Access Token headers for appId:accessKey', async () => {
    await generateTTS(
      {
        providerId: 'doubao-tts',
        voice: 'zh_female_vv_uranus_bigtts',
        apiKey: '123456:access-token',
      },
      '你好',
    );

    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    const headers = init?.headers as Record<string, string>;

    expect(headers['X-Api-App-Id']).toBe('123456');
    expect(headers['X-Api-Access-Key']).toBe('access-token');
    expect(headers.Authorization).toBe('Bearer;access-token');
    expect(headers['X-Api-Resource-Id']).toBe('seed-tts-2.0');
    expect(headers['X-Api-Key']).toBeUndefined();
  });

  it('uses new-console X-Api-Key when only an API Key is provided', async () => {
    await generateTTS(
      {
        providerId: 'doubao-tts',
        voice: 'zh_female_vv_uranus_bigtts',
        apiKey: 'volc-api-key',
      },
      '你好',
    );

    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    const headers = init?.headers as Record<string, string>;

    expect(headers['X-Api-Key']).toBe('volc-api-key');
    expect(headers['X-Api-App-Id']).toBeUndefined();
    expect(headers['X-Api-Access-Key']).toBeUndefined();
  });

  it('treats api-key-* names in the App ID field as new-console API Key mode', async () => {
    await generateTTS(
      {
        providerId: 'doubao-tts',
        voice: 'zh_female_vv_uranus_bigtts',
        apiKey: 'api-key-20260420145019:volc-api-key',
      },
      '你好',
    );

    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    const headers = init?.headers as Record<string, string>;

    expect(headers['X-Api-Key']).toBe('volc-api-key');
    expect(headers['X-Api-App-Id']).toBeUndefined();
    expect(headers['X-Api-Access-Key']).toBeUndefined();
  });
});
