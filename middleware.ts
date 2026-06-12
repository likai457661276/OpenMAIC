import { NextRequest, NextResponse } from 'next/server';
import {
  AUTO_TEACHER_PRODUCTION_ALLOWED_ORIGINS,
  AUTO_TEACHER_TEST_ALLOWED_ORIGINS,
  isAutoTeacherTestEnvironment,
  parseOriginList,
} from './lib/auto-teacher/origins';

/** Convert string to Uint8Array */
function encode(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/** Convert ArrayBuffer to hex string */
function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Verify an HMAC-signed token using Web Crypto API (Edge-compatible) */
async function verifyToken(token: string, accessCode: string): Promise<boolean> {
  const dotIndex = token.indexOf('.');
  if (dotIndex === -1) return false;

  const timestamp = token.substring(0, dotIndex);
  const signature = token.substring(dotIndex + 1);

  const keyData = encode(accessCode);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const data = encode(timestamp);
  const expected = bufToHex(await crypto.subtle.sign('HMAC', key, data.buffer as ArrayBuffer));

  // Constant-length comparison (not truly constant-time in JS, but sufficient here)
  if (signature.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < signature.length; i++) {
    mismatch |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

function getRuntimeFrameAncestors(): string {
  const ancestors = new Set([
    "'self'",
    ...AUTO_TEACHER_PRODUCTION_ALLOWED_ORIGINS,
    ...parseOriginList(process.env.ALLOWED_FRAME_ANCESTORS),
    ...parseOriginList(process.env.NEXT_PUBLIC_AUTO_TEACHER_ALLOWED_ORIGINS),
  ]);

  if (isAutoTeacherTestEnvironment()) {
    AUTO_TEACHER_TEST_ALLOWED_ORIGINS.forEach((origin) => ancestors.add(origin));
  }

  return Array.from(ancestors).join(' ');
}

function withRuntimeFrameHeaders(response: NextResponse): NextResponse {
  response.headers.set('Content-Security-Policy', `frame-ancestors ${getRuntimeFrameAncestors()}`);
  response.headers.delete('X-Frame-Options');
  return response;
}

export async function middleware(request: NextRequest) {
  const accessCode = process.env.ACCESS_CODE;
  if (!accessCode) {
    return withRuntimeFrameHeaders(NextResponse.next());
  }

  const { pathname } = request.nextUrl;

  // Whitelist: access-code endpoints, health check
  if (pathname.startsWith('/api/access-code/') || pathname === '/api/health') {
    return withRuntimeFrameHeaders(NextResponse.next());
  }

  // Check cookie — validate HMAC signature, not just existence
  const cookie = request.cookies.get('openmaic_access');
  if (cookie?.value && (await verifyToken(cookie.value, accessCode))) {
    return withRuntimeFrameHeaders(NextResponse.next());
  }

  // API requests without valid cookie → 401
  if (pathname.startsWith('/api/')) {
    return withRuntimeFrameHeaders(
      NextResponse.json(
        { success: false, errorCode: 'INVALID_REQUEST', error: 'Access code required' },
        { status: 401 },
      ),
    );
  }

  // Page requests → let through, frontend shows modal
  return withRuntimeFrameHeaders(NextResponse.next());
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logos/).*)'],
};
