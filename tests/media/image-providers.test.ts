import { describe, expect, it } from 'vitest';
import { IMAGE_PROVIDERS } from '@/lib/media/image-providers';

describe('IMAGE_PROVIDERS', () => {
  it('includes SiliconFlow ERNIE image turbo model', () => {
    expect(IMAGE_PROVIDERS['siliconflow-image'].models).toContainEqual({
      id: 'baidu/ERNIE-Image-Turbo',
      name: 'Baidu / ERNIE-Image-Turbo',
    });
  });
});
