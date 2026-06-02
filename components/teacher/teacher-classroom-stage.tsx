'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  AlertCircle,
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  FileText,
  Monitor,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
  Sun,
} from 'lucide-react';
import { SceneProvider } from '@/lib/contexts/scene-context';
import { useTheme } from '@/lib/hooks/use-theme';
import { useStageStore } from '@/lib/store';
import { PENDING_SCENE_ID } from '@/lib/store/stage';
import { cn } from '@/lib/utils';
import { SceneRenderer } from '@/components/stage/scene-renderer';
import { ThumbnailSlide } from '@/components/slide-renderer/components/ThumbnailSlide';
import { ThumbnailInteractive } from '@/components/slide-renderer/components/ThumbnailInteractive';
import type { Action } from '@/lib/types/action';
import type { InteractiveContent, Scene, SlideContent } from '@/lib/types/stage';
import { useCanvasStore } from '@/lib/store/canvas';

function getTeacherNarration(scene: Scene | null): string[] {
  if (!scene || scene.type !== 'slide') return [];

  return (scene.actions ?? [])
    .flatMap((action: Action) => {
      if (action.type === 'speech') return [action.text];
      if (
        action.type === 'widget_highlight' ||
        action.type === 'widget_setState' ||
        action.type === 'widget_annotation' ||
        action.type === 'widget_reveal'
      ) {
        return action.content ? [action.content] : [];
      }
      return [];
    })
    .map((text) => text.trim())
    .filter(Boolean);
}

function SceneThumbnail({
  scene,
  index,
  active,
}: {
  scene: Scene;
  index: number;
  active: boolean;
}) {
  const viewportSize = useCanvasStore.use.viewportSize();
  const viewportRatio = useCanvasStore.use.viewportRatio();
  const isSlide = scene.type === 'slide';
  const slideContent = isSlide ? (scene.content as SlideContent) : null;
  const interactiveContent =
    scene.type === 'interactive' ? (scene.content as InteractiveContent) : null;

  return (
    <div
      className={cn(
        'relative aspect-video w-full overflow-hidden rounded-md bg-gray-100 ring-1 dark:bg-gray-800',
        active ? 'ring-purple-300 dark:ring-purple-600' : 'ring-gray-200 dark:ring-gray-700',
      )}
    >
      {slideContent ? (
        <ThumbnailSlide
          slide={slideContent.canvas}
          viewportSize={viewportSize}
          viewportRatio={viewportRatio}
          size={168}
        />
      ) : interactiveContent ? (
        <ThumbnailInteractive content={interactiveContent} size={168} />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
          <FileText className="h-5 w-5" />
        </div>
      )}
      <span
        className={cn(
          'absolute left-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold',
          active
            ? 'bg-purple-600 text-white dark:bg-purple-500'
            : 'bg-white/90 text-gray-600 dark:bg-gray-900/90 dark:text-gray-300',
        )}
      >
        {index + 1}
      </span>
    </div>
  );
}

function PendingThumbnail({
  index,
  title,
  active,
  failed,
  retrying,
  onRetry,
}: {
  index: number;
  title: string;
  active: boolean;
  failed: boolean;
  retrying: boolean;
  onRetry?: () => void;
}) {
  return (
    <div className="w-full rounded-lg p-1.5 text-left">
      <div
        className={cn(
          'relative aspect-video w-full overflow-hidden rounded-md ring-1',
          failed
            ? 'bg-red-50/40 ring-red-100 dark:bg-red-950/10 dark:ring-red-900/30'
            : 'bg-gray-100 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700',
          active && !failed && 'ring-purple-300 dark:ring-purple-600',
        )}
      >
        <span
          className={cn(
            'absolute left-1.5 top-1.5 z-10 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold',
            active && !failed
              ? 'bg-purple-600 text-white dark:bg-purple-500'
              : 'bg-white/90 text-gray-500 dark:bg-gray-900/90 dark:text-gray-400',
          )}
        >
          {index + 1}
        </span>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
          {failed ? (
            <div className="flex items-center gap-1.5 text-xs font-medium text-red-500 dark:text-red-400">
              {onRetry ? (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onRetry();
                  }}
                  disabled={retrying}
                  className="rounded-md p-1 transition-colors hover:bg-red-100 disabled:opacity-50 dark:hover:bg-red-900/40"
                  aria-label="重试生成页面"
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', retrying && 'animate-spin')} />
                </button>
              ) : (
                <AlertCircle className="h-3.5 w-3.5" />
              )}
              <span>{retrying ? '重试中' : '生成失败'}</span>
            </div>
          ) : (
            <>
              <div className="h-2 w-3/5 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-1.5 w-2/5 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <span className="mt-0.5 text-[9px] font-medium text-gray-400 dark:text-gray-500">
                生成中
              </span>
            </>
          )}
        </div>
        {!failed && (
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/10" />
        )}
      </div>
      <p
        className={cn(
          'mt-1.5 line-clamp-1 px-0.5 text-xs font-medium',
          active && !failed
            ? 'text-purple-700 dark:text-purple-300'
            : failed
              ? 'text-red-500 dark:text-red-400'
              : 'text-gray-400 dark:text-gray-500',
        )}
      >
        {title}
      </p>
    </div>
  );
}

function PendingPage({
  failed,
  retrying,
  title,
  onRetry,
}: {
  failed: boolean;
  retrying: boolean;
  title?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-white text-center dark:bg-gray-800">
      {failed ? (
        <>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">页面生成失败</h3>
          <p className="mt-2 max-w-xs text-sm leading-6 text-gray-500 dark:text-gray-400">
            {title
              ? `「${title}」生成时遇到问题，可以重试生成这一页。`
              : '生成时遇到问题，可以重试生成这一页。'}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              disabled={retrying}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
            >
              <RefreshCw className={cn('h-4 w-4', retrying && 'animate-spin')} />
              {retrying ? '重试中' : '重试生成'}
            </button>
          )}
        </>
      ) : (
        <>
          <div className="relative mb-4 h-12 w-12">
            <div className="absolute inset-0 rounded-full border-2 border-gray-100 dark:border-gray-700" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-purple-500 animate-spin dark:border-t-purple-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">正在生成页面</h3>
          <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
            {title || '下一页课件'} 正在生成，请稍候。
          </p>
        </>
      )}
    </div>
  );
}

export function TeacherClassroomStage({
  onRetryOutline,
}: {
  readonly onRetryOutline?: (outlineId: string) => Promise<void>;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const stage = useStageStore((state) => state.stage);
  const scenes = useStageStore((state) => state.scenes);
  const currentSceneId = useStageStore((state) => state.currentSceneId);
  const setCurrentSceneId = useStageStore((state) => state.setCurrentSceneId);
  const generatingOutlines = useStageStore((state) => state.generatingOutlines);
  const failedOutlines = useStageStore((state) => state.failedOutlines);

  const [drawerOpen, setDrawerOpen] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [themeOpen, setThemeOpen] = useState(false);
  const [retryingOutlineId, setRetryingOutlineId] = useState<string | null>(null);
  const themeRef = useRef<HTMLDivElement>(null);

  const pendingOutline = generatingOutlines[0] ?? null;
  const isPendingScene = currentSceneId === PENDING_SCENE_ID;
  const pendingFailed =
    !!pendingOutline && failedOutlines.some((outline) => outline.id === pendingOutline.id);
  const isRetryingPending = !!pendingOutline && retryingOutlineId === pendingOutline.id;

  const currentScene = useMemo(() => {
    if (currentSceneId === PENDING_SCENE_ID) return null;
    if (!currentSceneId) return scenes[0] ?? null;
    return scenes.find((scene) => scene.id === currentSceneId) ?? scenes[0] ?? null;
  }, [currentSceneId, scenes]);

  const hasPendingSlot = !!pendingOutline;
  const totalSceneCount = scenes.length + (hasPendingSlot ? 1 : 0);
  const currentSceneIndex = isPendingScene
    ? scenes.length
    : currentScene
      ? Math.max(
          0,
          scenes.findIndex((scene) => scene.id === currentScene.id),
        )
      : 0;
  const narration = useMemo(() => getTeacherNarration(currentScene), [currentScene]);
  const showNarration = currentScene?.type === 'slide';

  const goToScene = useCallback(
    (index: number) => {
      if (index === scenes.length && pendingOutline) {
        setCurrentSceneId(PENDING_SCENE_ID);
        return;
      }
      const nextScene = scenes[index];
      if (nextScene) setCurrentSceneId(nextScene.id);
    },
    [pendingOutline, scenes, setCurrentSceneId],
  );

  const handleRetryOutline = useCallback(
    async (outlineId: string) => {
      if (!onRetryOutline) return;
      setRetryingOutlineId(outlineId);
      try {
        await onRetryOutline(outlineId);
        setCurrentSceneId(PENDING_SCENE_ID);
      } finally {
        setRetryingOutlineId(null);
      }
    },
    [onRetryOutline, setCurrentSceneId],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]')) {
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        goToScene(currentSceneIndex - 1);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        goToScene(currentSceneIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSceneIndex, goToScene]);

  useEffect(() => {
    if (!themeOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(event.target as Node)) {
        setThemeOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [themeOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <aside
        className={cn(
          'hidden shrink-0 flex-col bg-white/80 transition-[width,padding] duration-200 dark:bg-slate-900/80 lg:flex',
          previewOpen
            ? 'w-56 border-r border-gray-100 p-3 dark:border-gray-800'
            : 'w-0 overflow-hidden border-r-0 p-0',
        )}
      >
        <button
          onClick={() => router.push('/teacher')}
          className="mb-4 flex h-9 items-center gap-2 rounded-md px-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          返回教师备课
        </button>
        <div className="mb-3 px-1">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500">教案课件</p>
          <h1 className="mt-1 line-clamp-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
            {stage?.name || '教师课件'}
          </h1>
        </div>
        <div className="scrollbar-hide min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {scenes.map((scene, index) => {
            const active = scene.id === currentScene?.id;
            return (
              <button
                key={scene.id}
                onClick={() => setCurrentSceneId(scene.id)}
                className={cn(
                  'w-full rounded-lg p-1.5 text-left transition-colors',
                  active
                    ? 'bg-purple-50 dark:bg-purple-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                )}
              >
                <SceneThumbnail scene={scene} index={index} active={active} />
                <p
                  className={cn(
                    'mt-1.5 line-clamp-1 px-0.5 text-xs font-medium',
                    active
                      ? 'text-purple-700 dark:text-purple-300'
                      : 'text-gray-600 dark:text-gray-300',
                  )}
                >
                  {scene.title}
                </p>
              </button>
            );
          })}
          {pendingOutline && (
            <div
              onClick={() => {
                setCurrentSceneId(PENDING_SCENE_ID);
              }}
              className={cn(
                'w-full rounded-lg text-left transition-colors',
                isPendingScene
                  ? 'bg-purple-50 dark:bg-purple-900/20'
                  : 'opacity-70 hover:bg-gray-50 dark:hover:bg-gray-800/50',
              )}
            >
              <PendingThumbnail
                index={scenes.length}
                title={pendingOutline.title}
                active={isPendingScene}
                failed={pendingFailed}
                retrying={isRetryingPending}
                onRetry={onRetryOutline ? () => handleRetryOutline(pendingOutline.id) : undefined}
              />
            </div>
          )}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200/70 bg-white/85 px-4 backdrop-blur dark:border-gray-800 dark:bg-gray-900/85 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setPreviewOpen((open) => !open)}
              className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100 lg:flex"
              aria-label={previewOpen ? '隐藏左侧预览栏' : '显示左侧预览栏'}
            >
              {previewOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </button>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500">教师教案预览</p>
              <h2 className="truncate text-base font-semibold text-gray-900 dark:text-gray-100 md:text-lg">
                {currentScene?.title || pendingOutline?.title || stage?.name || '教师课件'}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="mr-1 flex items-center rounded-full border border-gray-100/50 bg-white/60 px-1.5 py-1 shadow-sm backdrop-blur-md dark:border-gray-700/50 dark:bg-gray-800/60">
              <div className="relative" ref={themeRef}>
                <button
                  onClick={() => setThemeOpen((open) => !open)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-all hover:bg-white hover:text-gray-800 hover:shadow-sm dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                  aria-label="切换主题"
                >
                  {theme === 'light' && <Sun className="h-4 w-4" />}
                  {theme === 'dark' && <Moon className="h-4 w-4" />}
                  {theme === 'system' && <Monitor className="h-4 w-4" />}
                </button>
                {themeOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 min-w-[150px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    <button
                      onClick={() => {
                        setTheme('light');
                        setThemeOpen(false);
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-700',
                        theme === 'light' &&
                          'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
                      )}
                    >
                      <Sun className="h-4 w-4" />
                      浅色
                    </button>
                    <button
                      onClick={() => {
                        setTheme('dark');
                        setThemeOpen(false);
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-700',
                        theme === 'dark' &&
                          'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
                      )}
                    >
                      <Moon className="h-4 w-4" />
                      深色
                    </button>
                    <button
                      onClick={() => {
                        setTheme('system');
                        setThemeOpen(false);
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-700',
                        theme === 'system' &&
                          'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
                      )}
                    >
                      <Monitor className="h-4 w-4" />
                      跟随系统
                    </button>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => goToScene(currentSceneIndex - 1)}
              disabled={currentSceneIndex <= 0}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
              aria-label="上一页"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-14 text-center text-sm font-medium tabular-nums text-gray-500 dark:text-gray-400">
              {totalSceneCount > 0 ? currentSceneIndex + 1 : 0} / {totalSceneCount}
            </span>
            <button
              onClick={() => goToScene(currentSceneIndex + 1)}
              disabled={currentSceneIndex >= totalSceneCount - 1}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
              aria-label="下一页"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {showNarration && (
              <button
                onClick={() => setDrawerOpen((open) => !open)}
                className="ml-1 flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                aria-label={drawerOpen ? '收起讲解稿' : '展开讲解稿'}
              >
                {drawerOpen ? (
                  <PanelRightClose className="h-4 w-4" />
                ) : (
                  <PanelRightOpen className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <section className="flex min-w-0 flex-1 items-center justify-center p-3 md:p-6">
            <div className="aspect-video w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-xl ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
              {isPendingScene ? (
                <PendingPage
                  failed={pendingFailed}
                  retrying={isRetryingPending}
                  title={pendingOutline?.title}
                  onRetry={
                    pendingOutline && onRetryOutline
                      ? () => handleRetryOutline(pendingOutline.id)
                      : undefined
                  }
                />
              ) : currentScene ? (
                <SceneProvider>
                  <SceneRenderer scene={currentScene} mode="playback" />
                </SceneProvider>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-gray-500">
                  暂无课件内容
                </div>
              )}
            </div>
          </section>

          {showNarration && (
            <aside
              className={cn(
                'hidden shrink-0 border-l border-gray-200 bg-white transition-[width] duration-200 dark:border-gray-800 dark:bg-gray-900 md:flex md:flex-col',
                drawerOpen ? 'w-[360px] xl:w-[420px]' : 'w-0 overflow-hidden border-l-0',
              )}
            >
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-100 px-5 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <BookOpenText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    教师讲解稿
                  </h3>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  第 {currentSceneIndex + 1} 页
                </span>
              </div>
              <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto px-5 py-4">
                {narration.length > 0 ? (
                  <div className="space-y-3">
                    {narration.map((text, index) => (
                      <div
                        key={`${currentScene?.id}-${index}`}
                        className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-800/70"
                      >
                        <p className="mb-1 text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                          讲解 {index + 1}
                        </p>
                        <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-gray-300">
                          {text}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-center text-sm leading-6 text-gray-400 dark:text-gray-500">
                    当前课件页暂无教师讲解内容。
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}
