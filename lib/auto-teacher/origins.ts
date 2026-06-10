export const AUTO_TEACHER_TEST_ALLOWED_ORIGINS = [
  'http://guizhou.teaching.test.bin-go.me',
] as const;

export function isAutoTeacherTestEnvironment(env: NodeJS.ProcessEnv = process.env): boolean {
  const envName =
    env.APP_ENV || env.NEXT_PUBLIC_APP_ENV || env.FEATURE_FLAG_ENV || env.VERCEL_ENV || '';
  return /^(test|testing|staging)$/i.test(envName.trim());
}

export function parseOriginList(value: string | undefined): string[] {
  return (value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getAutoTeacherAllowedOrigins(params?: {
  configuredOrigins?: string;
  env?: NodeJS.ProcessEnv;
}): string[] {
  const origins = new Set(parseOriginList(params?.configuredOrigins));
  if (isAutoTeacherTestEnvironment(params?.env)) {
    AUTO_TEACHER_TEST_ALLOWED_ORIGINS.forEach((origin) => origins.add(origin));
  }
  return Array.from(origins);
}
