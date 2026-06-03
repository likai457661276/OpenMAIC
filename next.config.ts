import type { NextConfig } from 'next';

const BASE_PATH = '/bingo-agent-class';

function publicFeatureFlag(name: string, defaultValue: boolean): string {
  const value = process.env[name] ?? process.env[`NEXT_PUBLIC_${name}`];
  if (!value?.trim()) return String(defaultValue);
  return value;
}

const nextConfig: NextConfig = {
  basePath: BASE_PATH,
  output: process.env.VERCEL ? undefined : 'standalone',
  transpilePackages: ['mathml2omml', 'pptxgenjs'],
  serverExternalPackages: [],
  env: {
    NEXT_PUBLIC_BASE_PATH: BASE_PATH,
    NEXT_PUBLIC_FEATURE_TEACHER_EXTENSION: publicFeatureFlag('FEATURE_TEACHER_EXTENSION', true),
    NEXT_PUBLIC_FEATURE_LESSON_GENERATION: publicFeatureFlag('FEATURE_LESSON_GENERATION', true),
    NEXT_PUBLIC_FEATURE_RICH_COURSEWARE: publicFeatureFlag('FEATURE_RICH_COURSEWARE', true),
    NEXT_PUBLIC_FEATURE_QUIZ_GENERATION: publicFeatureFlag('FEATURE_QUIZ_GENERATION', true),
    NEXT_PUBLIC_FEATURE_PBL_GENERATION: publicFeatureFlag('FEATURE_PBL_GENERATION', true),
    NEXT_PUBLIC_FEATURE_REALTIME_ANSWER: publicFeatureFlag('FEATURE_REALTIME_ANSWER', true),
    NEXT_PUBLIC_FEATURE_ONLINE_SCORING: publicFeatureFlag('FEATURE_ONLINE_SCORING', true),
    NEXT_PUBLIC_FEATURE_CLASSROOM_FEEDBACK: publicFeatureFlag('FEATURE_CLASSROOM_FEEDBACK', true),
    NEXT_PUBLIC_FEATURE_PPTX_EXPORT: publicFeatureFlag('FEATURE_PPTX_EXPORT', true),
    NEXT_PUBLIC_FEATURE_WHITEBOARD: publicFeatureFlag('FEATURE_WHITEBOARD', false),
    NEXT_PUBLIC_FEATURE_VOICE_NARRATION: publicFeatureFlag('FEATURE_VOICE_NARRATION', false),
    NEXT_PUBLIC_FEATURE_VOICE_PLAYBACK: publicFeatureFlag('FEATURE_VOICE_PLAYBACK', false),
    NEXT_PUBLIC_FEATURE_FOLLOW_PRESENTER: publicFeatureFlag('FEATURE_FOLLOW_PRESENTER', false),
    NEXT_PUBLIC_FEATURE_COMPLEX_REALTIME_PLAYBACK: publicFeatureFlag(
      'FEATURE_COMPLEX_REALTIME_PLAYBACK',
      false,
    ),
  },
  experimental: {
    proxyClientMaxBodySize: '200mb',
  },
  async headers() {
    const extraAncestors = process.env.ALLOWED_FRAME_ANCESTORS?.trim();
    const frameAncestors = extraAncestors ? `'self' ${extraAncestors}` : "'self'";

    return [
      {
        source: '/(.*)',
        headers: [
          // X-Frame-Options only supports SAMEORIGIN (no allow-list),
          // so we omit it when custom ancestors are configured.
          ...(!extraAncestors ? [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }] : []),
          {
            key: 'Content-Security-Policy',
            value: `frame-ancestors ${frameAncestors}`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
