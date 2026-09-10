import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NextConfig } from 'next';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';

async function loadConfig(): Promise<NextConfig> {
  vi.resetModules();
  const mod = await import('@/next.config');
  return mod.default;
}

describe('Security response headers', () => {
  afterEach(() => {
    delete process.env.ALLOWED_FRAME_ANCESTORS;
    delete process.env.NEXT_PUBLIC_AUTO_TEACHER_ALLOWED_ORIGINS;
    vi.unstubAllEnvs();
  });

  it.each(['development', 'production'])(
    'allows any iframe parent and omits X-Frame-Options in %s',
    async (nodeEnv) => {
      vi.stubEnv('NODE_ENV', nodeEnv);
      const config = await loadConfig();
      const headerGroups = await config.headers!();
      const allRouteGroup = headerGroups.find((group) => group.source === '/(.*)')!;

      expect(allRouteGroup).toBeDefined();
      expect(allRouteGroup.headers).toContainEqual({
        key: 'Content-Security-Policy',
        value: 'frame-ancestors *',
      });
      expect(
        allRouteGroup.headers.find((header) => header.key === 'X-Frame-Options'),
      ).toBeUndefined();
    },
  );

  it('keeps iframe embedding permissive regardless of legacy allowlist variables', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.ALLOWED_FRAME_ANCESTORS = 'https://partner.example.com';
    process.env.NEXT_PUBLIC_AUTO_TEACHER_ALLOWED_ORIGINS = 'https://parent.example.com';

    const config = await loadConfig();
    const headerGroups = await config.headers!();
    const allRouteGroup = headerGroups.find((group) => group.source === '/(.*)')!;

    expect(allRouteGroup.headers).toContainEqual({
      key: 'Content-Security-Policy',
      value: 'frame-ancestors *',
    });
  });
});

describe('Runtime security response headers', () => {
  afterEach(() => {
    delete process.env.ACCESS_CODE;
    delete process.env.ALLOWED_FRAME_ANCESTORS;
    delete process.env.NEXT_PUBLIC_AUTO_TEACHER_ALLOWED_ORIGINS;
    vi.unstubAllEnvs();
  });

  it.each(['development', 'production'])(
    'keeps any iframe parent allowed when middleware overwrites the %s CSP',
    async (nodeEnv) => {
      vi.stubEnv('NODE_ENV', nodeEnv);

      const response = await middleware(
        new NextRequest('http://localhost:10050/bingo-agent-class/auto-teacher'),
      );

      expect(response.headers.get('Content-Security-Policy')).toBe('frame-ancestors *');
      expect(response.headers.get('X-Frame-Options')).toBeNull();
    },
  );
});
