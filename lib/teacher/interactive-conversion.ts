import { nanoid } from 'nanoid';
import {
  BROWSER_NATIVE_TTS_PROVIDER_ID,
  isTTSProviderEnabled,
  type TTSEnablementConfig,
} from '@/lib/audio/provider-enablement';
import type { Action, SpeechAction } from '@/lib/types/action';
import type { Scene } from '@/lib/types/stage';

export interface TeacherInteractiveTTSSettingsSnapshot {
  ttsEnabled: boolean;
  ttsProviderId: string;
  ttsProvidersConfig?: Partial<Record<string, TTSEnablementConfig>>;
}

export interface TeacherInteractiveSpeechEnsureResult {
  inserted: boolean;
  speechText?: string;
}

function normalizeSceneText(value: string): string {
  return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function shorten(value: string, maxLength: number): string {
  const normalized = normalizeSceneText(value);
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}…`;
}

export function extractTeacherInteractiveSceneText(scene: Scene): string {
  if (scene.content.type === 'slide') {
    const elements = scene.content.canvas.elements as unknown as Array<Record<string, unknown>>;
    return elements
      .map((element) => {
        const content = element.content;
        if (typeof content === 'string') return normalizeSceneText(content);
        const text = element.text;
        return typeof text === 'string' ? normalizeSceneText(text) : '';
      })
      .filter(Boolean)
      .slice(0, 8)
      .join('；');
  }
  if (scene.content.type === 'quiz') {
    return scene.content.questions
      .map((question) => question.question)
      .filter(Boolean)
      .slice(0, 5)
      .join('；');
  }
  if (scene.content.type === 'interactive') {
    return scene.content.widgetConfig
      ? JSON.stringify(scene.content.widgetConfig).slice(0, 500)
      : normalizeSceneText(scene.content.html || '').slice(0, 500) || scene.title;
  }
  if (scene.content.type === 'pbl') {
    return (
      scene.content.projectConfig.projectInfo.description ||
      scene.content.projectConfig.projectInfo.title
    );
  }
  return scene.title;
}

export function buildTeacherInteractiveFallbackSpeechText(scene: Scene): string {
  const title = normalizeSceneText(scene.title || '');
  const sceneText = shorten(extractTeacherInteractiveSceneText(scene), 160);

  if (title && sceneText && sceneText !== title) {
    return `我们先来看“${title}”。这一页的重点是：${sceneText}。`;
  }
  if (sceneText) {
    return `我们先来看这一页：${sceneText}。`;
  }
  if (title) {
    return `我们先来看“${title}”这一页的内容。`;
  }
  return '我们先来看这一页的内容。';
}

export function ensureTeacherInteractiveSpeechAction(
  scene: Scene,
  createId: () => string = nanoid,
): TeacherInteractiveSpeechEnsureResult {
  const actions = scene.actions || [];
  const hasSpeech = actions.some(
    (action): action is SpeechAction =>
      action.type === 'speech' && normalizeSceneText(action.text).length > 0,
  );

  if (hasSpeech) return { inserted: false };

  const speechText = buildTeacherInteractiveFallbackSpeechText(scene);
  const fallbackSpeech: SpeechAction = {
    id: createId(),
    type: 'speech',
    title: '开场讲解',
    text: speechText,
  };

  const nextActions: Action[] = [...actions];
  const discussionIndex = nextActions.findIndex((action) => action.type === 'discussion');
  if (discussionIndex >= 0) {
    nextActions.splice(discussionIndex, 0, fallbackSpeech);
  } else {
    nextActions.unshift(fallbackSpeech);
  }
  scene.actions = nextActions;

  return { inserted: true, speechText };
}

export function collectTeacherInteractiveSpeechTexts(actions: Action[] | undefined): string[] {
  return (actions || [])
    .filter(
      (action): action is SpeechAction =>
        action.type === 'speech' && normalizeSceneText(action.text).length > 0,
    )
    .map((action) => normalizeSceneText(action.text));
}

export function getTeacherInteractiveTTSBlockReason(
  settings: TeacherInteractiveTTSSettingsSnapshot,
): string | undefined {
  if (!settings.ttsEnabled) {
    return '当前环境未启用 TTS，无法生成可导出的互动课音频。';
  }
  if (settings.ttsProviderId === BROWSER_NATIVE_TTS_PROVIDER_ID) {
    return '当前环境使用浏览器原生 TTS，无法写入导出包音频文件。请配置服务端 TTS provider 后重试。';
  }
  if (
    !isTTSProviderEnabled(
      settings.ttsProviderId as Parameters<typeof isTTSProviderEnabled>[0],
      settings.ttsProvidersConfig?.[settings.ttsProviderId],
    )
  ) {
    return '当前环境 TTS provider 未配置或不可用，无法生成可导出的互动课音频。请检查服务端 TTS provider。';
  }
  return undefined;
}
