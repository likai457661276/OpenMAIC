import { type NextRequest } from 'next/server';
import { parsePDF } from '@/lib/pdf/pdf-providers';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { validateUrlForSSRF } from '@/lib/server/ssrf-guard';
import { createLogger } from '@/lib/logger';
import {
  AUTO_TEACHER_MAX_PDF_SIZE_BYTES,
  getAutoTeacherAllowedPdfOrigins,
  isOriginAllowed,
} from '@/lib/auto-teacher/protocol';
import type { ParsedPdfContent } from '@/lib/types/pdf';

const log = createLogger('AutoTeacher PDF');
const MAX_REDIRECTS = 3;

export const maxDuration = 120;

function isPdfContentType(contentType: string | null): boolean {
  const normalized = (contentType || '').toLowerCase();
  return (
    normalized.includes('application/pdf') ||
    normalized.includes('application/x-pdf') ||
    normalized.includes('application/octet-stream')
  );
}

function getTrustedAutoTeacherOrigins(uploadUrl: string | undefined): Set<string> {
  const trustedOrigins = new Set(
    getAutoTeacherAllowedPdfOrigins({
      configuredPdfOrigins: process.env.AUTO_TEACHER_ALLOWED_PDF_ORIGINS,
      configuredParentOrigins: process.env.NEXT_PUBLIC_AUTO_TEACHER_ALLOWED_ORIGINS,
    }),
  );

  if (!uploadUrl) return trustedOrigins;

  let parsedUploadUrl: URL;
  try {
    parsedUploadUrl = new URL(uploadUrl);
  } catch {
    return trustedOrigins;
  }

  if (parsedUploadUrl.protocol !== 'https:' && parsedUploadUrl.protocol !== 'http:') {
    return trustedOrigins;
  }

  const origin = parsedUploadUrl.origin;
  if (
    isOriginAllowed({
      origin,
      allowedOrigins: Array.from(trustedOrigins),
      nodeEnv: process.env.NODE_ENV,
    })
  ) {
    trustedOrigins.add(origin);
  }

  return trustedOrigins;
}

function isTrustedAutoTeacherLocalTarget(url: string, trustedOrigins: Set<string>): boolean {
  if (trustedOrigins.size === 0) return false;

  try {
    return trustedOrigins.has(new URL(url).origin);
  } catch {
    return false;
  }
}

async function fetchPdfWithValidation(url: string, trustedOrigins: Set<string>): Promise<Response> {
  let currentUrl = url;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    const ssrfError = await validateUrlForSSRF(currentUrl);
    if (ssrfError && !isTrustedAutoTeacherLocalTarget(currentUrl, trustedOrigins)) {
      throw Object.assign(new Error(ssrfError), { status: 403, code: 'INVALID_URL' });
    }

    let response: Response;
    try {
      response = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        headers: {
          Accept: 'application/pdf,application/octet-stream;q=0.8,*/*;q=0.1',
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown network error';
      throw Object.assign(new Error(`Failed to fetch PDF: ${message}`), {
        status: 502,
        code: 'UPSTREAM_ERROR',
      });
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) {
        throw Object.assign(new Error('PDF URL redirect missing Location header'), {
          status: 502,
          code: 'UPSTREAM_ERROR',
        });
      }
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    return response;
  }

  throw Object.assign(new Error('Too many redirects while fetching PDF'), {
    status: 508,
    code: 'TOO_MANY_REDIRECTS',
  });
}

async function parseDownloadedPdf(arrayBuffer: ArrayBuffer): Promise<ParsedPdfContent> {
  try {
    return await parsePDF({ providerId: 'unpdf' }, Buffer.from(arrayBuffer));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to parse PDF';
    throw Object.assign(new Error(`Unable to parse PDF content: ${message}`), {
      status: 422,
      code: 'PARSE_FAILED',
    });
  }
}

export async function POST(req: NextRequest) {
  let fileUrl: string | undefined;
  try {
    let body: { file_url?: unknown; upload_url?: unknown };
    try {
      body = (await req.json()) as { file_url?: unknown; upload_url?: unknown };
    } catch {
      return apiError('INVALID_REQUEST', 400, 'Invalid JSON request body');
    }

    if (typeof body.file_url !== 'string' || !body.file_url.trim()) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Missing required field: file_url');
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(body.file_url.trim());
    } catch {
      return apiError('INVALID_URL', 400, 'Invalid file_url');
    }

    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      return apiError('INVALID_URL', 400, 'Only HTTP(S) URLs are allowed');
    }

    fileUrl = parsedUrl.toString();
    const trustedOrigins = getTrustedAutoTeacherOrigins(
      typeof body.upload_url === 'string' ? body.upload_url : undefined,
    );
    const response = await fetchPdfWithValidation(fileUrl, trustedOrigins);
    if (!response.ok) {
      return apiError(
        'UPSTREAM_ERROR',
        502,
        `Failed to fetch PDF: HTTP ${response.status}`,
        response.statusText,
      );
    }

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > AUTO_TEACHER_MAX_PDF_SIZE_BYTES) {
      return apiError('INVALID_REQUEST', 413, 'PDF file is too large');
    }

    const contentType = response.headers.get('content-type');
    if (!isPdfContentType(contentType)) {
      return apiError(
        'INVALID_REQUEST',
        415,
        `Invalid PDF content type: ${contentType || 'unknown'}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > AUTO_TEACHER_MAX_PDF_SIZE_BYTES) {
      return apiError('INVALID_REQUEST', 413, 'PDF file is too large');
    }

    const result = await parseDownloadedPdf(arrayBuffer);
    const resultWithMetadata: ParsedPdfContent = {
      ...result,
      metadata: {
        ...result.metadata,
        pageCount: result.metadata?.pageCount ?? 0,
        fileName: decodeURIComponent(parsedUrl.pathname.split('/').pop() || 'document.pdf'),
        fileSize: arrayBuffer.byteLength,
      },
    };

    return apiSuccess({ data: resultWithMetadata });
  } catch (error) {
    const status = (error as { status?: number }).status || 500;
    const code = (error as { code?: string }).code || 'PARSE_FAILED';
    log.error(`Auto teacher PDF parsing failed [url="${fileUrl ?? 'unknown'}"]:`, error);
    return apiError(
      code as Parameters<typeof apiError>[0],
      status,
      error instanceof Error ? error.message : 'Failed to parse PDF URL',
    );
  }
}
