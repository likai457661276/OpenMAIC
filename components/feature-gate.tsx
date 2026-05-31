'use client';

import type { ReactNode } from 'react';
import { useFeatureFlag, type FeatureFlagKey } from '@/lib/hooks/use-feature-flag';

interface FeatureGateProps {
  feature: FeatureFlagKey;
  children?: ReactNode;
  fallback?: ReactNode;
}

export function FeatureGate({ feature, children, fallback = null }: FeatureGateProps): ReactNode {
  return useFeatureFlag(feature) ? children : fallback;
}
