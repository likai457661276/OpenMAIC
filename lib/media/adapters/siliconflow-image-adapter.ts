/**
 * SiliconFlow image generation adapter.
 *
 * Uses the official SiliconFlow image API:
 * POST https://api.siliconflow.cn/v1/images/generations
 */

import type {
  ImageGenerationConfig,
  ImageGenerationOptions,
  ImageGenerationResult,
} from '../types';

const DEFAULT_MODEL = 'Qwen/Qwen-Image';
const DEFAULT_BASE_URL = 'https://api.siliconflow.cn/v1';

function resolveImageSize(options: ImageGenerationOptions): string {
  const width = options.width || 1664;
  const height = options.height || 928;
  return `${width}x${height}`;
}

async function postGenerationRequest(
  config: ImageGenerationConfig,
  options: ImageGenerationOptions,
) {
  return fetch(`${config.baseUrl || DEFAULT_BASE_URL}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || DEFAULT_MODEL,
      prompt: options.prompt,
      negative_prompt: options.negativePrompt || undefined,
      image_size: resolveImageSize(options),
    }),
  });
}

export async function testSiliconFlowImageConnectivity(
  config: ImageGenerationConfig,
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await postGenerationRequest(config, {
      prompt: 'test',
      width: 1,
      height: 1,
    });

    if (response.status === 401 || response.status === 403) {
      const text = await response.text();
      return {
        success: false,
        message: `SiliconFlow Image auth failed (${response.status}): ${text}`,
      };
    }

    return { success: true, message: 'Connected to SiliconFlow Image' };
  } catch (err) {
    return {
      success: false,
      message: `SiliconFlow Image connectivity error: ${err}`,
    };
  }
}

export async function generateWithSiliconFlowImage(
  config: ImageGenerationConfig,
  options: ImageGenerationOptions,
): Promise<ImageGenerationResult> {
  const response = await postGenerationRequest(config, options);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SiliconFlow Image generation failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  const imageUrl = data.images?.[0]?.url;

  if (!imageUrl) {
    throw new Error('SiliconFlow Image response missing image URL');
  }

  return {
    url: imageUrl,
    width: options.width || 1664,
    height: options.height || 928,
  };
}
