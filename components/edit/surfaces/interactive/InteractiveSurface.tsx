'use client';

import { useMemo } from 'react';
import { Globe2 } from 'lucide-react';
import type { SceneEditorSurface, SurfaceState } from '@/lib/edit/scene-editor-surface';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useStageStore } from '@/lib/store/stage';
import type { InteractiveContent, Scene } from '@/lib/types/stage';
import { patchHtmlForIframe } from '@/lib/utils/iframe';

interface InteractiveSelection {
  readonly field: 'html' | 'url' | null;
}

type InteractiveScene = Scene & { content: InteractiveContent };

const EMPTY_INTERACTIVE: InteractiveContent = {
  type: 'interactive',
  url: '',
  html: '',
};

function currentInteractiveContent(sceneId: string | null): InteractiveContent {
  if (!sceneId) return EMPTY_INTERACTIVE;
  const scene = useStageStore.getState().scenes.find((item) => item.id === sceneId);
  return scene?.type === 'interactive' && scene.content.type === 'interactive'
    ? scene.content
    : EMPTY_INTERACTIVE;
}

function updateInteractiveContent(sceneId: string | null, patch: Partial<InteractiveContent>) {
  if (!sceneId) return;
  const scene = useStageStore.getState().scenes.find((item) => item.id === sceneId);
  if (!scene || scene.type !== 'interactive' || scene.content.type !== 'interactive') return;

  useStageStore.getState().updateScene(sceneId, {
    content: {
      ...scene.content,
      ...patch,
      type: 'interactive',
    },
    updatedAt: Date.now(),
  });
}

function useCurrentInteractiveScene() {
  return useStageStore((state) => {
    const scene = state.scenes.find((item) => item.id === state.currentSceneId) ?? null;
    return scene?.type === 'interactive' && scene.content.type === 'interactive'
      ? (scene as InteractiveScene)
      : null;
  });
}

function InteractiveCanvas() {
  const { t } = useI18n();
  const scene = useCurrentInteractiveScene();
  const content = scene?.content ?? EMPTY_INTERACTIVE;
  const patchedHtml = useMemo(
    () => (content.html ? patchHtmlForIframe(content.html) : undefined),
    [content.html],
  );

  if (!scene) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        {t('edit.interactive.noScene')}
      </div>
    );
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(320px,420px)_minmax(0,1fr)] bg-zinc-100 dark:bg-zinc-950">
      <aside className="flex min-h-0 flex-col border-r border-zinc-200 bg-white/90 dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            <Globe2 className="h-4 w-4 text-violet-500" />
            {t('edit.interactive.title')}
          </div>
          <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
            {t('edit.interactive.description')}
          </p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
          <label className="grid gap-2">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
              {t('edit.interactive.pageTitle')}
            </span>
            <input
              value={scene.title}
              onChange={(event) =>
                useStageStore.getState().updateScene(scene.id, {
                  title: event.target.value,
                  updatedAt: Date.now(),
                })
              }
              className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
              {t('edit.interactive.url')}
            </span>
            <input
              value={content.url}
              onChange={(event) => updateInteractiveContent(scene.id, { url: event.target.value })}
              placeholder="https://example.com/demo"
              className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>

          <label className="grid min-h-[360px] flex-1 gap-2">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
              {t('edit.interactive.html')}
            </span>
            <textarea
              value={content.html ?? ''}
              onChange={(event) => updateInteractiveContent(scene.id, { html: event.target.value })}
              spellCheck={false}
              className="min-h-[320px] flex-1 resize-none rounded-md border border-zinc-200 bg-zinc-950 px-3 py-2 font-mono text-xs leading-5 text-zinc-100 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700"
            />
          </label>
        </div>
      </aside>

      <section className="flex min-h-0 items-center justify-center p-6">
        <div className="aspect-video h-full max-h-full max-w-full overflow-hidden rounded-lg bg-white shadow-2xl ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
          {patchedHtml || content.url ? (
            <iframe
              key={patchedHtml ?? content.url}
              srcDoc={patchedHtml}
              src={patchedHtml ? undefined : content.url}
              className="h-full w-full border-0"
              title={scene.title}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-400">
              {t('edit.interactive.emptyPreview')}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function useInteractiveSurfaceState(): SurfaceState<InteractiveContent, InteractiveSelection> {
  const sceneId = useStageStore((state) => state.currentSceneId);
  const content = useStageStore((state) => {
    const scene = state.scenes.find((item) => item.id === state.currentSceneId);
    return scene?.type === 'interactive' && scene.content.type === 'interactive'
      ? scene.content
      : EMPTY_INTERACTIVE;
  });

  return {
    content: content ?? currentInteractiveContent(sceneId),
    selection: { field: null },
    hasSelection: false,
    insertItems: [],
    floatingActions: [],
    commands: [],
    hints: [],
  };
}

export const interactiveSurface: SceneEditorSurface<InteractiveContent, InteractiveSelection> = {
  sceneType: 'interactive',
  SurfaceComponent: InteractiveCanvas,
  useSurfaceState: useInteractiveSurfaceState,
};
