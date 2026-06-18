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

  describe('default (no ALLOWED_FRAME_ANCESTORS)', () => {
    it('nextConfig.headers() is defined', async () => {
      const config = await loadConfig();
      expect(config.headers).toBeDefined();
      expect(typeof config.headers).toBe('function');
    });

    it('omits X-Frame-Options because the production teaching domain is iframe-allowed by default', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      const config = await loadConfig();
      const headerGroups = await config.headers!();
      const allRouteGroup = headerGroups.find((g) => g.source === '/(.*)')!;

      expect(allRouteGroup).toBeDefined();
      expect(allRouteGroup.headers.find((h) => h.key === 'X-Frame-Options')).toBeUndefined();
    });

    it("includes Content-Security-Policy frame-ancestors with 'self' and the production teaching domain", async () => {
      vi.stubEnv('NODE_ENV', 'production');
      const config = await loadConfig();
      const headerGroups = await config.headers!();
      const allRouteGroup = headerGroups.find((g) => g.source === '/(.*)')!;

      expect(allRouteGroup).toBeDefined();
      expect(allRouteGroup.headers).toContainEqual({
        key: 'Content-Security-Policy',
        value:
          "frame-ancestors 'self' https://bingo-teaching.app.bin-go.cc http://bingo-teaching.app.bin-go.cc",
      });
    });
  });

  describe('with ALLOWED_FRAME_ANCESTORS', () => {
    it('appends allowed origins to frame-ancestors', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      process.env.ALLOWED_FRAME_ANCESTORS = 'https://partner.example.com';
      const config = await loadConfig();
      const headerGroups = await config.headers!();
      const allRouteGroup = headerGroups.find((g) => g.source === '/(.*)')!;

      expect(allRouteGroup.headers).toContainEqual({
        key: 'Content-Security-Policy',
        value:
          "frame-ancestors 'self' https://bingo-teaching.app.bin-go.cc http://bingo-teaching.app.bin-go.cc https://partner.example.com",
      });
    });

    it('omits X-Frame-Options when custom ancestors are set', async () => {
      process.env.ALLOWED_FRAME_ANCESTORS = 'https://partner.example.com';
      const config = await loadConfig();
      const headerGroups = await config.headers!();
      const allRouteGroup = headerGroups.find((g) => g.source === '/(.*)')!;

      const xfo = allRouteGroup.headers.find((h) => h.key === 'X-Frame-Options');
      expect(xfo).toBeUndefined();
    });

    it('supports multiple space-separated origins', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      process.env.ALLOWED_FRAME_ANCESTORS = 'https://a.example.com https://b.example.com';
      const config = await loadConfig();
      const headerGroups = await config.headers!();
      const allRouteGroup = headerGroups.find((g) => g.source === '/(.*)')!;

      expect(allRouteGroup.headers).toContainEqual({
        key: 'Content-Security-Policy',
        value:
          "frame-ancestors 'self' https://bingo-teaching.app.bin-go.cc http://bingo-teaching.app.bin-go.cc https://a.example.com https://b.example.com",
      });
    });
  });

  describe('with NEXT_PUBLIC_AUTO_TEACHER_ALLOWED_ORIGINS', () => {
    it('uses auto-teacher allowed origins as frame ancestors in production', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      process.env.NEXT_PUBLIC_AUTO_TEACHER_ALLOWED_ORIGINS =
        'https://parent.example.com:8443,http://school.example.com:8080';

      const config = await loadConfig();
      const headerGroups = await config.headers!();
      const allRouteGroup = headerGroups.find((g) => g.source === '/(.*)')!;

      expect(allRouteGroup.headers).toContainEqual({
        key: 'Content-Security-Policy',
        value:
          "frame-ancestors 'self' https://bingo-teaching.app.bin-go.cc http://bingo-teaching.app.bin-go.cc https://parent.example.com:8443 http://school.example.com:8080",
      });
    });

    it('omits X-Frame-Options when auto-teacher origins are configured', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      process.env.NEXT_PUBLIC_AUTO_TEACHER_ALLOWED_ORIGINS = 'https://parent.example.com';

      const config = await loadConfig();
      const headerGroups = await config.headers!();
      const allRouteGroup = headerGroups.find((g) => g.source === '/(.*)')!;

      const xfo = allRouteGroup.headers.find((h) => h.key === 'X-Frame-Options');
      expect(xfo).toBeUndefined();
    });

    it('merges and deduplicates explicit frame ancestors and auto-teacher origins', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      process.env.ALLOWED_FRAME_ANCESTORS = 'https://parent.example.com https://other.example.com';
      process.env.NEXT_PUBLIC_AUTO_TEACHER_ALLOWED_ORIGINS =
        'https://parent.example.com,https://school.example.com:8080';

      const config = await loadConfig();
      const headerGroups = await config.headers!();
      const allRouteGroup = headerGroups.find((g) => g.source === '/(.*)')!;

      expect(allRouteGroup.headers).toContainEqual({
        key: 'Content-Security-Policy',
        value:
          "frame-ancestors 'self' https://bingo-teaching.app.bin-go.cc http://bingo-teaching.app.bin-go.cc https://parent.example.com https://other.example.com https://school.example.com:8080",
      });
    });
  });

  describe('auto-teacher test environment frame ancestors', () => {
    it('allows the Guizhou teaching test domain as iframe parent', async () => {
      vi.stubEnv('APP_ENV', 'test');
      vi.stubEnv('NODE_ENV', 'production');

      const config = await loadConfig();
      const headerGroups = await config.headers!();
      const allRouteGroup = headerGroups.find((g) => g.source === '/(.*)')!;

      expect(allRouteGroup.headers).toContainEqual({
        key: 'Content-Security-Policy',
        value:
          "frame-ancestors 'self' https://bingo-teaching.app.bin-go.cc http://bingo-teaching.app.bin-go.cc http://guizhou.teaching.test.bin-go.me",
      });
      expect(allRouteGroup.headers.find((h) => h.key === 'X-Frame-Options')).toBeUndefined();
    });
  });

  describe('development iframe embedding', () => {
    it('allows an external parent page to embed the local development server', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      const config = await loadConfig();
      const headerGroups = await config.headers!();
      const allRouteGroup = headerGroups.find((g) => g.source === '/(.*)')!;

      expect(allRouteGroup.headers).toContainEqual({
        key: 'Content-Security-Policy',
        value: "frame-ancestors 'self' *",
      });
    });

    it('omits X-Frame-Options in development so port-based embedding can work', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      const config = await loadConfig();
      const headerGroups = await config.headers!();
      const allRouteGroup = headerGroups.find((g) => g.source === '/(.*)')!;

      const xfo = allRouteGroup.headers.find((h) => h.key === 'X-Frame-Options');
      expect(xfo).toBeUndefined();
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

  it('keeps external iframe parents allowed when middleware overwrites the development CSP', async () => {
    vi.stubEnv('NODE_ENV', 'development');

    const response = await middleware(
      new NextRequest('http://localhost:10050/bingo-agent-class/auto-teacher'),
    );

    expect(response.headers.get('Content-Security-Policy')).toBe("frame-ancestors 'self' *");
  });

  it('does not add development iframe parents to the production runtime CSP', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    const response = await middleware(
      new NextRequest('http://localhost:10050/bingo-agent-class/auto-teacher'),
    );

    expect(response.headers.get('Content-Security-Policy')).toBe(
      "frame-ancestors 'self' https://bingo-teaching.app.bin-go.cc http://bingo-teaching.app.bin-go.cc",
    );
  });
});
