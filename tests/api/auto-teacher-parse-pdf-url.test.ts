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
