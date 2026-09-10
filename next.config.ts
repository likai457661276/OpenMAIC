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
  transpilePackages: ['mathml2omml', 'pptxgenjs', '@openmaic/importer'],
  // These agent packages do a runtime `import(specifier)` with a computed
  // specifier (to lazily load node:fs/os/path without breaking browser/Vite
  // builds). webpack can't statically analyze that and bundling it throws
  // "Cannot find module as expression is too dynamic" at runtime on the server
  // (the "Edit with AI" Pro-mode path), which broke the #619 keep-alive e2e.
  // Mark them server-external so Next loads them natively and the dynamic
  // import resolves as a real Node call.
  serverExternalPackages: ['@earendil-works/pi-ai', '@earendil-works/pi-agent-core'],
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
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: 'frame-ancestors *',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
