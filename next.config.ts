import type { NextConfig } from 'next';
import {
  AUTO_TEACHER_TEST_ALLOWED_ORIGINS,
  isAutoTeacherTestEnvironment,
} from './lib/auto-teacher/origins';

const BASE_PATH = '/bingo-agent-class';
const DEV_FRAME_ANCESTORS = [
  'http://localhost',
  'http://localhost:*',
  'http://127.0.0.1',
  'http://127.0.0.1:*',
];

function publicFeatureFlag(name: string, defaultValue: boolean): string {
  const value = process.env[name] ?? process.env[`NEXT_PUBLIC_${name}`];
  if (!value?.trim()) return String(defaultValue);
  return value;
}

function parseFrameAncestorSources(value: string | undefined): string[] {
  return (value || '')
    .split(/[\s,]+/)
    .map((source) => source.trim())
    .filter(Boolean);
}

function getFrameAncestors(): string {
  const ancestors = new Set(["'self'"]);
  const configuredAncestors = [
    ...parseFrameAncestorSources(process.env.ALLOWED_FRAME_ANCESTORS),
    ...parseFrameAncestorSources(process.env.NEXT_PUBLIC_AUTO_TEACHER_ALLOWED_ORIGINS),
  ];

  if (configuredAncestors.length > 0) {
    configuredAncestors.forEach((ancestor) => ancestors.add(ancestor));
    if (isAutoTeacherTestEnvironment()) {
      AUTO_TEACHER_TEST_ALLOWED_ORIGINS.forEach((ancestor) => ancestors.add(ancestor));
    }
  } else if (process.env.NODE_ENV === 'development') {
    DEV_FRAME_ANCESTORS.forEach((ancestor) => ancestors.add(ancestor));
  } else if (isAutoTeacherTestEnvironment()) {
    AUTO_TEACHER_TEST_ALLOWED_ORIGINS.forEach((ancestor) => ancestors.add(ancestor));
  }

  return Array.from(ancestors).join(' ');
}

function hasFrameAncestorOverrides(): boolean {
  return (
    parseFrameAncestorSources(process.env.ALLOWED_FRAME_ANCESTORS).length > 0 ||
    parseFrameAncestorSources(process.env.NEXT_PUBLIC_AUTO_TEACHER_ALLOWED_ORIGINS).length > 0 ||
    isAutoTeacherTestEnvironment() ||
    process.env.NODE_ENV === 'development'
  );
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
    const frameAncestors = getFrameAncestors();
    const hasCustomAncestors = hasFrameAncestorOverrides();

    return [
      {
        source: '/(.*)',
        headers: [
          // X-Frame-Options only supports SAMEORIGIN (no allow-list),
          // so we omit it when custom ancestors are configured.
          ...(!hasCustomAncestors ? [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }] : []),
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
