export const AUTO_TEACHER_TEST_ALLOWED_ORIGINS = [
  'http://guizhou.teaching.test.bin-go.me',
] as const;

export const AUTO_TEACHER_DEVELOPMENT_FRAME_ANCESTORS = ['*'] as const;

export const AUTO_TEACHER_PRODUCTION_ALLOWED_ORIGINS = [
  'https://bingo-teaching.app.bin-go.cc',
  'http://bingo-teaching.app.bin-go.cc',
] as const;

type AutoTeacherOriginEnv = Partial<NodeJS.ProcessEnv>;

export function isAutoTeacherTestEnvironment(env: AutoTeacherOriginEnv = process.env): boolean {
  const envName =
    env.APP_ENV || env.NEXT_PUBLIC_APP_ENV || env.FEATURE_FLAG_ENV || env.VERCEL_ENV || '';
  return /^(test|testing|staging)$/i.test(envName.trim());
}

export function shouldUseDefaultTestPdfOrigins(env: AutoTeacherOriginEnv = process.env): boolean {
  return env.NODE_ENV !== 'production' || isAutoTeacherTestEnvironment(env);
}

export function parseOriginList(value: string | undefined): string[] {
  return (value || '')
    .split(/[\s,]+/)
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getAutoTeacherAllowedOrigins(params?: {
  configuredOrigins?: string;
  env?: AutoTeacherOriginEnv;
}): string[] {
  const origins = new Set(parseOriginList(params?.configuredOrigins));
  const env = params?.env ?? process.env;
  if (env.NODE_ENV === 'production') {
    AUTO_TEACHER_PRODUCTION_ALLOWED_ORIGINS.forEach((origin) => origins.add(origin));
  }
  if (isAutoTeacherTestEnvironment(env)) {
    AUTO_TEACHER_TEST_ALLOWED_ORIGINS.forEach((origin) => origins.add(origin));
  }
  return Array.from(origins);
}

export function getAutoTeacherAllowedPdfOrigins(params?: {
  configuredPdfOrigins?: string;
  configuredParentOrigins?: string;
  env?: AutoTeacherOriginEnv;
}): string[] {
  const origins = new Set([
    ...parseOriginList(params?.configuredPdfOrigins),
    ...getAutoTeacherAllowedOrigins({
      configuredOrigins: params?.configuredParentOrigins,
      env: params?.env,
    }),
  ]);

  if (shouldUseDefaultTestPdfOrigins(params?.env)) {
    AUTO_TEACHER_TEST_ALLOWED_ORIGINS.forEach((origin) => origins.add(origin));
  }

  return Array.from(origins);
}
