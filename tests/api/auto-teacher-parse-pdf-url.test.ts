import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  validateUrlForSSRF: vi.fn(),
  parsePDF: vi.fn(),
}));

vi.mock('@/lib/server/ssrf-guard', () => ({
  validateUrlForSSRF: mocks.validateUrlForSSRF,
}));

vi.mock('@/lib/pdf/pdf-providers', () => ({
  parsePDF: mocks.parsePDF,
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

async function postParsePdfUrl(body: Record<string, unknown>) {
  return postParsePdfUrlRaw(JSON.stringify(body));
}

async function postParsePdfUrlRaw(body: string) {
  const { POST } = await import('@/app/api/auto-teacher/parse-pdf-url/route');
  const req = new Request('http://localhost/api/auto-teacher/parse-pdf-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  return POST(req as unknown as NextRequest);
}

describe('POST /api/auto-teacher/parse-pdf-url', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    mocks.validateUrlForSSRF.mockReset();
    mocks.validateUrlForSSRF.mockResolvedValue(null);
    mocks.parsePDF.mockReset();
    mocks.parsePDF.mockResolvedValue({
      text: 'parsed pdf text',
      images: ['data:image/png;base64,abc'],
      metadata: { pageCount: 2, parser: 'unpdf' },
    });
  });

  it('fetches PDF URL and parses with fixed unpdf provider', async () => {
    const pdfBytes = new Uint8Array([1, 2, 3]);
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

    const res = await postParsePdfUrl({ file_url: 'https://cdn.example.com/course.pdf' });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({
      success: true,
      data: {
        text: 'parsed pdf text',
        metadata: {
          pageCount: 2,
          parser: 'unpdf',
          fileName: 'course.pdf',
          fileSize: 3,
        },
      },
    });
    expect(mocks.validateUrlForSSRF).toHaveBeenCalledWith('https://cdn.example.com/course.pdf');
    expect(mocks.parsePDF).toHaveBeenCalledWith({ providerId: 'unpdf' }, Buffer.from(pdfBytes));
  });

  it('rejects SSRF-blocked URL before fetching', async () => {
    mocks.validateUrlForSSRF.mockResolvedValue('blocked');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res = await postParsePdfUrl({ file_url: 'https://internal.example.com/course.pdf' });
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json).toMatchObject({ success: false, errorCode: 'INVALID_URL' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.parsePDF).not.toHaveBeenCalled();
  });

  it('allows a local PDF URL when it matches trusted auto-teacher upload origin', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_AUTO_TEACHER_ALLOWED_ORIGINS', 'http://localhost');
    mocks.validateUrlForSSRF.mockResolvedValue('blocked');
    const pdfBytes = new Uint8Array([1, 2, 3]);
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

    const res = await postParsePdfUrl({
      file_url: 'http://localhost/view/course.pdf',
      upload_url: 'http://localhost/api/upload',
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({ success: true });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost/view/course.pdf',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(mocks.parsePDF).toHaveBeenCalledWith({ providerId: 'unpdf' }, Buffer.from(pdfBytes));
  });

  it('allows a local PDF URL when its origin is whitelisted for test auto-teacher', async () => {
    vi.stubEnv('APP_ENV', 'test');
    mocks.validateUrlForSSRF.mockResolvedValue('blocked');
    const pdfBytes = new Uint8Array([1, 2, 3]);
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

    const res = await postParsePdfUrl({
      file_url: 'http://guizhou.teaching.test.bin-go.me/view/course.pdf',
      upload_url: 'http://guizhou.teaching.test.bin-go.me/api/upload',
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({ success: true });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://guizhou.teaching.test.bin-go.me/view/course.pdf',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(mocks.parsePDF).toHaveBeenCalledWith({ providerId: 'unpdf' }, Buffer.from(pdfBytes));
  });

  it('allows the Guizhou test PDF URL with a different localhost upload origin in development', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    mocks.validateUrlForSSRF.mockResolvedValue('blocked');
    const pdfBytes = new Uint8Array([1, 2, 3]);
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

    const res = await postParsePdfUrl({
      file_url: 'http://guizhou.teaching.test.bin-go.me/view/pdf-output/course.pdf',
      upload_url: 'http://localhost/api/upload',
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({ success: true });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://guizhou.teaching.test.bin-go.me/view/pdf-output/course.pdf',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(mocks.parsePDF).toHaveBeenCalledWith({ providerId: 'unpdf' }, Buffer.from(pdfBytes));
  });

  it('allows explicit PDF origins that differ from the upload origin in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('AUTO_TEACHER_ALLOWED_PDF_ORIGINS', 'http://pdf.example.com');
    mocks.validateUrlForSSRF.mockResolvedValue('blocked');
    const pdfBytes = new Uint8Array([1, 2, 3]);
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

    const res = await postParsePdfUrl({
      file_url: 'http://pdf.example.com/view/course.pdf',
      upload_url: 'https://parent.example.com/api/upload',
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({ success: true });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://pdf.example.com/view/course.pdf',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(mocks.parsePDF).toHaveBeenCalledWith({ providerId: 'unpdf' }, Buffer.from(pdfBytes));
  });

  it('keeps blocking local PDF URLs when upload origin is not trusted', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_AUTO_TEACHER_ALLOWED_ORIGINS', 'https://parent.example.com');
    mocks.validateUrlForSSRF.mockResolvedValue('blocked');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res = await postParsePdfUrl({
      file_url: 'http://localhost/view/course.pdf',
      upload_url: 'https://parent.example.com/api/upload',
    });
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json).toMatchObject({ success: false, errorCode: 'INVALID_URL' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.parsePDF).not.toHaveBeenCalled();
  });

  it('rejects non-PDF content type', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('html', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        }),
      ),
    );

    const res = await postParsePdfUrl({ file_url: 'https://cdn.example.com/course.pdf' });
    const json = await res.json();

    expect(res.status).toBe(415);
    expect(json).toMatchObject({ success: false, errorCode: 'INVALID_REQUEST' });
    expect(mocks.parsePDF).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON request body without returning 500', async () => {
    const res = await postParsePdfUrlRaw('{bad json');
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toMatchObject({
      success: false,
      errorCode: 'INVALID_REQUEST',
      error: 'Invalid JSON request body',
    });
    expect(mocks.parsePDF).not.toHaveBeenCalled();
  });

  it('returns upstream error when PDF fetch throws before a response', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    vi.stubGlobal('fetch', fetchMock);

    const res = await postParsePdfUrl({ file_url: 'https://cdn.example.com/course.pdf' });
    const json = await res.json();

    expect(res.status).toBe(502);
    expect(json).toMatchObject({
      success: false,
      errorCode: 'UPSTREAM_ERROR',
      error: 'Failed to fetch PDF: fetch failed',
    });
    expect(mocks.parsePDF).not.toHaveBeenCalled();
  });

  it('returns unprocessable PDF error when the downloaded PDF cannot be parsed', async () => {
    const pdfBytes = new Uint8Array([1, 2, 3]);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(pdfBytes, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Length': String(pdfBytes.byteLength),
          },
        }),
      ),
    );
    mocks.parsePDF.mockRejectedValue(new Error('Invalid PDF structure'));

    const res = await postParsePdfUrl({ file_url: 'https://cdn.example.com/broken.pdf' });
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json).toMatchObject({
      success: false,
      errorCode: 'PARSE_FAILED',
      error: 'Unable to parse PDF content: Invalid PDF structure',
    });
  });

  it('rejects PDFs larger than 50MB from content-length', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Length': String(50 * 1024 * 1024 + 1),
          },
        }),
      ),
    );

    const res = await postParsePdfUrl({ file_url: 'https://cdn.example.com/course.pdf' });
    const json = await res.json();

    expect(res.status).toBe(413);
    expect(json).toMatchObject({ success: false, errorCode: 'INVALID_REQUEST' });
    expect(mocks.parsePDF).not.toHaveBeenCalled();
  });

  it('returns upstream error when PDF fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('missing', { status: 404, statusText: 'Not Found' })),
    );

    const res = await postParsePdfUrl({ file_url: 'https://cdn.example.com/missing.pdf' });
    const json = await res.json();

    expect(res.status).toBe(502);
    expect(json).toMatchObject({ success: false, errorCode: 'UPSTREAM_ERROR' });
    expect(mocks.parsePDF).not.toHaveBeenCalled();
  });
});
