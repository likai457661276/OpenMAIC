import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FeatureGate } from '@/components/feature-gate';

describe('FeatureGate', () => {
  it('renders children for enabled feature flags', () => {
    const html = renderToStaticMarkup(
      createElement(FeatureGate, { feature: 'lessonGeneration' }, 'enabled'),
    );

    expect(html).toBe('enabled');
  });

  it('renders fallback for disabled feature flags', () => {
    const html = renderToStaticMarkup(
      createElement(
        FeatureGate,
        {
          feature: 'whiteboard',
          fallback: 'disabled',
        },
        'enabled',
      ),
    );

    expect(html).toBe('disabled');
  });
});
