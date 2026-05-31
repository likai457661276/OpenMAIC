'use client';

import { useMemo } from 'react';
import {
  getPublicFeatureFlag,
  getPublicFeatureFlags,
  type FeatureFlagKey,
  type FeatureFlags,
} from '@/lib/feature-flags';

export type { FeatureFlagKey, FeatureFlags };

export function useFeatureFlag(flag: FeatureFlagKey): boolean {
  return useMemo(() => getPublicFeatureFlag(flag), [flag]);
}

export function useFeatureFlags(): FeatureFlags {
  return useMemo(() => getPublicFeatureFlags(), []);
}
