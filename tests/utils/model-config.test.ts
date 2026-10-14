import { beforeEach, describe, expect, it, vi } from 'vitest';

const getState = vi.hoisted(() => vi.fn());
vi.mock('@/lib/store/settings', () => ({ useSettingsStore: { getState } }));

import { getModelRequestHeaders } from '@/lib/utils/model-config';

describe('model request headers', () => {
  beforeEach(() => {
    getState.mockReset();
    getState.mockReturnValue({
      providerId: 'qwen',
      modelId: 'deepseek-v4-flash',
      providersConfig: {
        qwen: {
          apiKey: 'browser-key',
          baseUrl: 'https://browser.example.com',
          type: 'openai',
          models: [],
        },
      },
      thinkingConfigs: {},
    });
  });

  it('sends only the server-model marker without consulting saved browser settings', () => {
    expect(getModelRequestHeaders(true)).toEqual({ 'x-use-server-model': 'true' });
    expect(getState).not.toHaveBeenCalled();
  });

  it('preserves the model and credentials selected by ordinary page users', () => {
    expect(getModelRequestHeaders()).toEqual({
      'x-model': 'qwen:deepseek-v4-flash',
      'x-api-key': 'browser-key',
      'x-base-url': 'https://browser.example.com',
      'x-provider-type': 'openai',
    });
  });
});
