import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

describe('createProxiedFetch', () => {
  const originalBasePath = process.env.NEXT_PUBLIC_BASE_PATH;
  const restoreBasePath = () => {
    if (originalBasePath === undefined) {
      delete process.env.NEXT_PUBLIC_BASE_PATH;
    } else {
      process.env.NEXT_PUBLIC_BASE_PATH = originalBasePath;
    }
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.resetModules();
    restoreBasePath();
  });

  afterAll(() => {
    restoreBasePath();
  });

  it('POSTs the original url to /api/proxy-media and returns the proxy response', async () => {
    const { createProxiedFetch } = await import('@/lib/export/proxied-fetch');
    const spy = vi.fn(
      async () =>
        new Response('BYTES', { status: 200, headers: { 'content-type': 'text/javascript' } }),
    );
    vi.stubGlobal('fetch', spy);
    const pfetch = createProxiedFetch();
    const res = await pfetch('https://cdn.tailwindcss.com');
    expect(spy).toHaveBeenCalledWith(
      '/api/proxy-media',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ url: 'https://cdn.tailwindcss.com' }),
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('BYTES');
  });

  it('handles URL objects', async () => {
    const { createProxiedFetch } = await import('@/lib/export/proxied-fetch');
    const spy = vi.fn(async () => new Response('', { status: 200 }));
    vi.stubGlobal('fetch', spy);
    await createProxiedFetch()(new URL('https://x/y.css'));
    expect(spy).toHaveBeenCalledWith(
      '/api/proxy-media',
      expect.objectContaining({
        body: JSON.stringify({ url: 'https://x/y.css' }),
      }),
    );
  });

  it('uses the configured basePath for the proxy endpoint', async () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/bingo-agent-class';
    const { createProxiedFetch } = await import('@/lib/export/proxied-fetch');
    const spy = vi.fn(async () => new Response('', { status: 200 }));
    vi.stubGlobal('fetch', spy);

    await createProxiedFetch()('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css');

    expect(spy).toHaveBeenCalledWith(
      '/bingo-agent-class/api/proxy-media',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          url: 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css',
        }),
      }),
    );
  });
});
