import type { FeatureFlagKey } from '@/lib/feature-flags';
import type { TeacherAdapterContext } from './types';

export abstract class BaseTeacherAdapter<TInput, TOriginalInput, TOriginalOutput, TOutput> {
  protected readonly featureFlags: TeacherAdapterContext['featureFlags'];

  constructor(context: TeacherAdapterContext) {
    this.featureFlags = context.featureFlags;
  }

  abstract readonly feature: FeatureFlagKey;

  isEnabled(): boolean {
    return this.featureFlags[this.feature];
  }

  protected ensureEnabled() {
    if (!this.isEnabled()) {
      throw new Error(`Feature "${this.feature}" is disabled.`);
    }
  }

  ensureAvailable() {
    this.ensureEnabled();
  }

  abstract transform(input: TInput): TOriginalInput;
  abstract parse(output: TOriginalOutput): TOutput;
  abstract execute(input: TInput): Promise<TOutput>;
}
