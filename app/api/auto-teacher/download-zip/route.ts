import { type NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { getAutoTeacherAllowedPdfOrigins } from '@/lib/auto-teacher/protocol';
import { apiError } from '@/lib/server/api-response';
import { validateUrlForSSRF } from '@/lib/server/ssrf-guard';

const log = createLogger('AutoTeacher ZIP');
const MAX_REDIRECTS = 3;
const MAX_ZIP_SIZE_BYTES = 500 * 1024 * 1024;

export const maxDuration = 120;

function isZipContentType(contentType: string | null): boolean {
  const normalized = (contentType || '').toLowerCase();
  return (
    !normalized ||
    normalized.includes('application/zip') ||
    normalized.includes('application/x-zip-compressed') ||
    normalized.includes('application/octet-stream') ||
    normalized.includes('binary/octet-stream')
  );
}

function getTrustedZipOrigins(): Set<string> {
  return new Set(
    getAutoTeacherAllowedPdfOrigins({
      configuredPdfOrigins:
        process.env.AUTO_TEACHER_ALLOWED_ZIP_ORIGINS ||
        process.env.AUTO_TEACHER_ALLOWED_PDF_ORIGINS,
      configuredParentOrigins: process.env.NEXT_PUBLIC_AUTO_TEACHER_ALLOWED_ORIGINS,
    }),
  );
}

function isTrustedAutoTeacherTarget(url: string, trustedOrigins: Set<string>): boolean {
  if (trustedOrigins.size === 0) return false;

  try {
    return trustedOrigins.has(new URL(url).origin);
  } catch {
    return false;
  }
}

async function fetchZipWithValidation(url: string, trustedOrigins: Set<string>): Promise<Response> {
  let currentUrl = url;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    const ssrfError = await validateUrlForSSRF(currentUrl);
    if (ssrfError && !isTrustedAutoTeacherTarget(currentUrl, trustedOrigins)) {
      throw Object.assign(new Error(ssrfError), { status: 403, code: 'INVALID_URL' });
    }

    const response = await fetch(currentUrl, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        Accept: 'application/zip,application/octet-stream;q=0.8,*/*;q=0.1',
      },
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) {
        throw Object.assign(new Error('ZIP URL redirect missing Location header'), {
          status: 502,
          code: 'UPSTREAM_ERROR',
        });
      }
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    return response;
  }

  throw Object.assign(new Error('Too many redirects while fetching ZIP'), {
    status: 508,
    code: 'TOO_MANY_REDIRECTS',
  });
}

export async function POST(req: NextRequest) {
  let zipUrl: string | undefined;
  try {
    const body = (await req.json()) as { zip_url?: unknown; zipUrl?: unknown; zipurl?: unknown };
    const zipUrlValue = body.zip_url ?? body.zipUrl ?? body.zipurl;
    if (typeof zipUrlValue !== 'string' || !zipUrlValue.trim()) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Missing required field: zip_url');
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(zipUrlValue.trim());
    } catch {
      return apiError('INVALID_URL', 400, 'Invalid zip_url');
    }

    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      return apiError('INVALID_URL', 400, 'Only HTTP(S) URLs are allowed');
    }

    zipUrl = parsedUrl.toString();
    const response = await fetchZipWithValidation(zipUrl, getTrustedZipOrigins());
    if (!response.ok) {
      return apiError(
        'UPSTREAM_ERROR',
        response.status >= 400 && response.status < 500 ? response.status : 502,
        `Failed to fetch ZIP: HTTP ${response.status}`,
        response.statusText,
      );
    }

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > MAX_ZIP_SIZE_BYTES) {
      return apiError('INVALID_REQUEST', 413, 'ZIP file is too large');
    }

    const contentType = response.headers.get('content-type');
    if (!isZipContentType(contentType)) {
      return apiError(
        'INVALID_REQUEST',
        415,
        `Invalid ZIP content type: ${contentType || 'unknown'}`,
      );
    }

    const blob = await response.blob();
    if (blob.size > MAX_ZIP_SIZE_BYTES) {
      return apiError('INVALID_REQUEST', 413, 'ZIP file is too large');
    }

    return new NextResponse(blob, {
      headers: {
        'Content-Type': contentType || 'application/zip',
        'Content-Length': String(blob.size),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const status = (error as { status?: number }).status || 500;
    const code = (error as { code?: string }).code || 'INTERNAL_ERROR';
    log.error(`Auto teacher ZIP download failed [url="${zipUrl ?? 'unknown'}"]:`, error);
    return apiError(
      code as Parameters<typeof apiError>[0],
      status,
      error instanceof Error ? error.message : 'Failed to download ZIP URL',
    );
  }
}
