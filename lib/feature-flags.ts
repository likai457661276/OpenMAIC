import {
  DEFAULT_FEATURE_FLAGS_BY_ENV,
  FEATURE_FLAG_ENV_NAMES,
  FEATURE_FLAG_KEYS,
  PUBLIC_FEATURE_FLAG_ENV_NAMES,
  type FeatureFlagEnvironment,
  type FeatureFlagKey,
  type FeatureFlags,
} from '@/configs/feature-flags';

type FeatureFlagEnv = Partial<Record<string, string | undefined>>;

export type { FeatureFlagEnvironment, FeatureFlagKey, FeatureFlags };
export {
  DEFAULT_FEATURE_FLAGS_BY_ENV,
  DEFAULT_TEACHER_MODE_FLAGS,
  FEATURE_FLAG_ENV_NAMES,
  FEATURE_FLAG_KEYS,
  PUBLIC_FEATURE_FLAG_ENV_NAMES,
} from '@/configs/feature-flags';

export function parseFeatureFlagValue(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;

  if (['1', 'true', 'yes', 'y', 'on', 'enabled'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'n', 'off', 'disabled'].includes(normalized)) {
    return false;
  }

  return undefined;
}

export function resolveFeatureFlagEnvironment(envName: string | undefined): FeatureFlagEnvironment {
  if (envName === 'staging') return 'staging';
  if (envName === 'production') return 'production';
  if (envName === 'test') return 'test';
  return 'development';
}

function getDefaultFlags(env: FeatureFlagEnv): FeatureFlags {
  const envName = env.FEATURE_FLAG_ENV || env.APP_ENV || env.NEXT_PUBLIC_APP_ENV || env.NODE_ENV;
  return DEFAULT_FEATURE_FLAGS_BY_ENV[resolveFeatureFlagEnvironment(envName)];
}

export function getFeatureFlags(env: FeatureFlagEnv = process.env): FeatureFlags {
  const defaults = getDefaultFlags(env);
  const flags = { ...defaults };

  for (const flag of FEATURE_FLAG_KEYS) {
    const privateValue = parseFeatureFlagValue(env[FEATURE_FLAG_ENV_NAMES[flag]]);
    const publicValue = parseFeatureFlagValue(env[PUBLIC_FEATURE_FLAG_ENV_NAMES[flag]]);
    flags[flag] = privateValue ?? publicValue ?? defaults[flag];
  }

  return flags;
}

export function getFeatureFlag(flag: FeatureFlagKey, env: FeatureFlagEnv = process.env): boolean {
  return getFeatureFlags(env)[flag];
}

const publicFeatureFlagEnv: FeatureFlagEnv = {
  NEXT_PUBLIC_FEATURE_TEACHER_EXTENSION: process.env.NEXT_PUBLIC_FEATURE_TEACHER_EXTENSION,
  NEXT_PUBLIC_FEATURE_LESSON_GENERATION: process.env.NEXT_PUBLIC_FEATURE_LESSON_GENERATION,
  NEXT_PUBLIC_FEATURE_RICH_COURSEWARE: process.env.NEXT_PUBLIC_FEATURE_RICH_COURSEWARE,
  NEXT_PUBLIC_FEATURE_QUIZ_GENERATION: process.env.NEXT_PUBLIC_FEATURE_QUIZ_GENERATION,
  NEXT_PUBLIC_FEATURE_PBL_GENERATION: process.env.NEXT_PUBLIC_FEATURE_PBL_GENERATION,
  NEXT_PUBLIC_FEATURE_REALTIME_ANSWER: process.env.NEXT_PUBLIC_FEATURE_REALTIME_ANSWER,
  NEXT_PUBLIC_FEATURE_ONLINE_SCORING: process.env.NEXT_PUBLIC_FEATURE_ONLINE_SCORING,
  NEXT_PUBLIC_FEATURE_CLASSROOM_FEEDBACK: process.env.NEXT_PUBLIC_FEATURE_CLASSROOM_FEEDBACK,
  NEXT_PUBLIC_FEATURE_PPTX_EXPORT: process.env.NEXT_PUBLIC_FEATURE_PPTX_EXPORT,
  NEXT_PUBLIC_FEATURE_WHITEBOARD: process.env.NEXT_PUBLIC_FEATURE_WHITEBOARD,
  NEXT_PUBLIC_FEATURE_VOICE_NARRATION: process.env.NEXT_PUBLIC_FEATURE_VOICE_NARRATION,
  NEXT_PUBLIC_FEATURE_VOICE_PLAYBACK: process.env.NEXT_PUBLIC_FEATURE_VOICE_PLAYBACK,
  NEXT_PUBLIC_FEATURE_FOLLOW_PRESENTER: process.env.NEXT_PUBLIC_FEATURE_FOLLOW_PRESENTER,
  NEXT_PUBLIC_FEATURE_COMPLEX_REALTIME_PLAYBACK:
    process.env.NEXT_PUBLIC_FEATURE_COMPLEX_REALTIME_PLAYBACK,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
};

export function getPublicFeatureFlags(): FeatureFlags {
  return getFeatureFlags(publicFeatureFlagEnv);
}

export function getPublicFeatureFlag(flag: FeatureFlagKey): boolean {
  return getPublicFeatureFlags()[flag];
}
