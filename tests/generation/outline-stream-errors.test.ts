import { APICallError } from 'ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ streamLLM: vi.fn(), resolveModel: vi.fn() }));
vi.mock('@/lib/ai/llm', () => ({ streamLLM: mocks.streamLLM }));
vi.mock('@/lib/server/resolve-model', () => ({ resolveModelFromRequest: mocks.resolveModel }));

const outline = {
  id: 'scene-1',
  type: 'slide',
  title: 'AI 入门',
  description: '认识人工智能',
  keyPoints: ['基本概念'],
};

function failStream(error: unknown, partial = false) {
  mocks.streamLLM.mockImplementation((params) => ({
    textStream: (async function* () {
      if (partial) yield JSON.stringify({ outlines: [outline] });
      // AI SDK reports errors via this callback, while textStream ends silently.
      await params.onError({ error });
    })(),
  }));
}

async function requestEvents() {
  const { POST } = await import('@/app/api/generate/scene-outlines-stream/route');
  const response = await POST({
    json: async () => ({ requirements: { requirement: '学习人工智能' } }),
    headers: new Headers(),
  } as unknown as Parameters<typeof POST>[0]);
  return (await response.text())
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => JSON.parse(line.slice(6)));
}

function apiError(statusCode: number, code: string, message: string, isRetryable = false) {
  return new APICallError({
    message,
    url: 'https://example.test/chat/completions',
    requestBodyValues: { model: 'unavailable-model' },
    statusCode,
    responseBody: JSON.stringify({ error: { code, message } }),
    isRetryable,
  });
}

describe('outline streaming errors', () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.streamLLM.mockReset();
    mocks.resolveModel.mockReset();
    mocks.resolveModel.mockResolvedValue({
      model: { provider: 'qwen.chat', modelId: 'qwen3.7-flash' },
      modelString: 'qwen:qwen3.7-flash',
      modelInfo: { outputWindow: 4096, capabilities: {} },
      apiKey: 'test-private-api-key',
    });
  });

  it.each([
    [404, 'model_not_found', 'Model not exist.'],
    [400, 'InvalidEndpoint.ClosedEndpoint', 'The endpoint is currently closed.'],
    [401, 'invalid_api_key', 'Incorrect API key.'],
  ])('preserves HTTP %s and provider code %s without retrying', async (status, code, message) => {
    failStream(apiError(status, code, message));
    const events = await requestEvents();

    expect(events).toEqual([
      {
        type: 'error',
        error: `HTTP ${status} / ${code}: ${message}`,
        statusCode: status,
        providerCode: code,
      },
    ]);
    expect(mocks.streamLLM).toHaveBeenCalledTimes(1);
  });

  it('retries temporary provider errors and retains the last upstream diagnosis', async () => {
    failStream(apiError(429, 'rate_limit_exceeded', 'Too many requests.', true));
    const events = await requestEvents();

    expect(events.filter((event) => event.type === 'retry')).toHaveLength(2);
    expect(events.at(-1)).toMatchObject({
      type: 'error',
      error: 'HTTP 429 / rate_limit_exceeded: Too many requests.',
      statusCode: 429,
    });
    expect(mocks.streamLLM).toHaveBeenCalledTimes(3);
  });

  it('does not emit done when the provider fails after partial output', async () => {
    failStream(apiError(400, 'InvalidEndpoint.ClosedEndpoint', 'Endpoint closed.'), true);
    const events = await requestEvents();

    expect(events.some((event) => event.type === 'outline')).toBe(true);
    expect(events.some((event) => event.type === 'done')).toBe(false);
    expect(events.at(-1)?.providerCode).toBe('InvalidEndpoint.ClosedEndpoint');
  });

  it('redacts credentials while retaining useful provider diagnostics', async () => {
    failStream(apiError(401, 'invalid_api_key', 'Invalid key: test-private-api-key'));
    const events = await requestEvents();

    expect(events.at(-1)?.error).toBe('HTTP 401 / invalid_api_key: Invalid key: [REDACTED]');
    expect(JSON.stringify(events)).not.toContain('test-private-api-key');
    expect(JSON.stringify(events)).not.toContain('requestBodyValues');
  });

  it('uses the empty-response error only for a truly empty successful stream', async () => {
    mocks.streamLLM.mockImplementation(() => ({ textStream: (async function* () {})() }));
    const events = await requestEvents();

    expect(events.at(-1)).toEqual({ type: 'error', error: 'LLM returned empty response' });
    expect(mocks.streamLLM).toHaveBeenCalledTimes(3);
  });
});
