import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  validateUrlForSSRF: vi.fn(),
}));

vi.mock('@/lib/server/ssrf-guard', () => ({
  validateUrlForSSRF: mocks.validateUrlForSSRF,
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

async function postDownloadZip(body: Record<string, unknown>) {
  const { POST } = await import('@/app/api/auto-teacher/download-zip/route');
  const req = new Request('http://localhost/api/auto-teacher/download-zip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return POST(req as unknown as NextRequest);
}

describe('POST /api/auto-teacher/download-zip', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    mocks.validateUrlForSSRF.mockReset();
    mocks.validateUrlForSSRF.mockResolvedValue(null);
  });

  it('downloads a remote ZIP and returns binary bytes', async () => {
    const zipBytes = new Uint8Array([80, 75, 3, 4]);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(zipBytes, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Length': String(zipBytes.byteLength),
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await postDownloadZip({ zip_url: 'https://cdn.example.com/course.zip' });
    const body = new Uint8Array(await res.arrayBuffer());

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/zip');
    expect(Array.from(body)).toEqual(Array.from(zipBytes));
    expect(mocks.validateUrlForSSRF).toHaveBeenCalledWith('https://cdn.example.com/course.zip');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://cdn.example.com/course.zip',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('allows the Guizhou test ZIP URL when APP_ENV is test', async () => {
    vi.stubEnv('APP_ENV', 'test');
    mocks.validateUrlForSSRF.mockResolvedValue('blocked');
    const zipBytes = new Uint8Array([80, 75, 3, 4]);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(zipBytes, {
        status: 200,
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': String(zipBytes.byteLength),
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await postDownloadZip({
      zip_url: 'http://guizhou.teaching.test.bin-go.me/view/course.zip',
    });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://guizhou.teaching.test.bin-go.me/view/course.zip',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('blocks SSRF URLs when their origin is not trusted', async () => {
    mocks.validateUrlForSSRF.mockResolvedValue('blocked');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res = await postDownloadZip({ zip_url: 'http://localhost/course.zip' });
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json).toMatchObject({ success: false, errorCode: 'INVALID_URL' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects missing and non-http ZIP URLs', async () => {
    const missing = await postDownloadZip({});
    expect(missing.status).toBe(400);
    expect(await missing.json()).toMatchObject({
      success: false,
      errorCode: 'MISSING_REQUIRED_FIELD',
    });

    const invalid = await postDownloadZip({ zip_url: 'file:///tmp/course.zip' });
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({
      success: false,
      errorCode: 'INVALID_URL',
    });
  });
});
