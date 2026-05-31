import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TEACHER_MODE_FLAGS,
  getFeatureFlag,
  getFeatureFlags,
  parseFeatureFlagValue,
} from '@/lib/feature-flags';

describe('feature flags', () => {
  it('uses teacher mode defaults when no overrides are set', () => {
    expect(getFeatureFlags({ NODE_ENV: 'test' })).toEqual(DEFAULT_TEACHER_MODE_FLAGS);
  });

  it('allows private feature env vars to override defaults', () => {
    const flags = getFeatureFlags({
      NODE_ENV: 'production',
      FEATURE_WHITEBOARD: 'true',
      FEATURE_LESSON_GENERATION: 'off',
    });

    expect(flags.whiteboard).toBe(true);
    expect(flags.lessonGeneration).toBe(false);
  });

  it('uses private env vars before public env vars', () => {
    expect(
      getFeatureFlag('voicePlayback', {
        FEATURE_VOICE_PLAYBACK: 'false',
        NEXT_PUBLIC_FEATURE_VOICE_PLAYBACK: 'true',
      }),
    ).toBe(false);
  });

  it('parses common boolean spellings', () => {
    expect(parseFeatureFlagValue('enabled')).toBe(true);
    expect(parseFeatureFlagValue('0')).toBe(false);
    expect(parseFeatureFlagValue('')).toBeUndefined();
    expect(parseFeatureFlagValue('maybe')).toBeUndefined();
  });
});
