import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  parsePDF: vi.fn(),
  validateUrlForSSRF: vi.fn(),
}));

vi.mock('@/lib/pdf/pdf-providers', () => ({
  parsePDF: mocks.parsePDF,
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

async function postParsePdf(body: Record<string, unknown>) {
  const { POST } = await import('@/app/api/auto-teacher/parse-pdf-url/route');
  const req = new Request('http://localhost/api/auto-teacher/parse-pdf-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return POST(req as unknown as NextRequest);
}

describe('POST /api/auto-teacher/parse-pdf-url', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    mocks.parsePDF.mockReset();
    mocks.validateUrlForSSRF.mockReset();
    mocks.validateUrlForSSRF.mockResolvedValue(null);
    mocks.parsePDF.mockResolvedValue({
      text: '解析后的教案文本',
      images: [],
      metadata: { pageCount: 1, parser: 'unpdf' },
    });
  });

  it('downloads and parses a PDF URL while forwarding the parent token', async () => {
    const pdfBytes = new Uint8Array([37, 80, 68, 70]);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(pdfBytes, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Length': String(pdfBytes.byteLength),
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await postParsePdf({
      file_url: 'https://cdn.example.com/course.pdf',
      token: 'token-123',
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true, data: { text: '解析后的教案文本' } });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://cdn.example.com/course.pdf',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'token-123' }),
      }),
    );
    expect(mocks.parsePDF).toHaveBeenCalledWith({ providerId: 'unpdf' }, expect.any(Buffer));
  });

  it('rejects a request without file_url', async () => {
    const response = await postParsePdf({ token: 'token-123' });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      errorCode: 'MISSING_REQUIRED_FIELD',
    });
  });

  it('allows the built-in production teaching PDF origin when DNS is classified as private', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    mocks.validateUrlForSSRF.mockResolvedValue('Private network target is not allowed');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(new Uint8Array([37, 80, 68, 70]), {
          status: 200,
          headers: { 'Content-Type': 'application/pdf' },
        }),
      ),
    );

    const response = await postParsePdf({
      file_url: 'https://bingo-teaching.app.bin-go.cc/view/pdf-output/course.pdf',
      token: 'token-123',
    });

    expect(response.status).toBe(200);
  });

  it('keeps SSRF protection for untrusted targets', async () => {
    mocks.validateUrlForSSRF.mockResolvedValue('Private network target is not allowed');

    const response = await postParsePdf({
      file_url: 'http://127.0.0.1/private.pdf',
      token: 'token-123',
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      errorCode: 'INVALID_URL',
    });
  });
});
