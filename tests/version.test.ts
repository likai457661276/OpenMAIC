import { describe, expect, it } from 'vitest';
import { getOpenMaicVersionPayload } from '@/lib/version';

describe('getOpenMaicVersionPayload', () => {
  it('returns stable app and zip format versions', () => {
    expect(getOpenMaicVersionPayload()).toEqual({
      appVersion: '0.2.2',
      zipFormatVersion: 1,
    });
  });
});
