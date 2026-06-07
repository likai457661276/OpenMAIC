import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { generateWithQwenImage } from '@/lib/media/adapters/qwen-image-adapter';

const mockFetch = vi.fn() as Mock;
vi.stubGlobal('fetch', mockFetch);

describe('qwen-image-adapter', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('posts to the configured DashScope generation endpoint without duplicating the path', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        output: {
          choices: [
            {
              message: {
                content: [{ image: 'https://cdn.example.com/qwen.png' }],
              },
            },
          ],
        },
      }),
    });

    const result = await generateWithQwenImage(
      {
        providerId: 'qwen-image',
        apiKey: 'sk-test',
        baseUrl:
          'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
        model: 'qwen-image-2.0-pro-2026-03-03',
      },
      { prompt: 'a classroom diagram', width: 1280, height: 720 },
    );

    expect(mockFetch).toHaveBeenCalledWith(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer sk-test',
        },
      }),
    );
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe('qwen-image-2.0-pro-2026-03-03');
    expect(body.parameters.size).toBe('1280*720');
    expect(result).toEqual({
      url: 'https://cdn.example.com/qwen.png',
      width: 1280,
      height: 720,
    });
  });
});
