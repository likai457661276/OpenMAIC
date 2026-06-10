'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  AlertCircle,
  BookOpen,
  Archive,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  FileDown,
  Loader2,
  Maximize2,
  Minimize2,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
  Save,
  WandSparkles,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SceneProvider } from '@/lib/contexts/scene-context';
import { useStageStore } from '@/lib/store';
import { useSettingsStore } from '@/lib/store/settings';
import { PENDING_SCENE_ID } from '@/lib/store/stage';
import { useMediaGenerationStore } from '@/lib/store/media-generation';
import { isMaicEditorEnabled } from '@/lib/config/feature-flags';
import { isCurrentSceneEditable } from '@/lib/edit/stage-mode';
import { preloadEditor } from '@/lib/edit/preload-editor';
import { useExportPPTX } from '@/lib/export/use-export-pptx';
import { buildClassroomZipBlob, useExportClassroom } from '@/lib/export/use-export-classroom';
import {
  AUTO_TEACHER_SAVE_ERROR_TYPE,
  AUTO_TEACHER_SAVE_SUCCESS_TYPE,
  inferAutoTeacherTeachType,
} from '@/lib/auto-teacher/protocol';
import { cn } from '@/lib/utils';
import { SceneRenderer } from '@/components/stage/scene-renderer';
import { HeaderControls } from '@/components/stage/header-controls';
import { EditShell } from '@/components/edit/EditShell';
import { SlideNavRail } from '@/components/edit/SlideNavRail';
import { LectureNotesView } from '@/components/chat/lecture-notes-view';
import { ThumbnailSlide } from '@/components/slide-renderer/components/ThumbnailSlide';
import { ThumbnailInteractive } from '@/components/slide-renderer/components/ThumbnailInteractive';
import { InteractiveIframeHost } from '@/components/scene-renderers/InteractiveIframeHost';
import { ThemeSwitcher } from '@/components/theme-switcher';
import type { DiscussionAction, SpeechAction } from '@/lib/types/action';
import type { InteractiveContent, Scene, SlideContent } from '@/lib/types/stage';
import type { LectureNoteEntry } from '@/lib/types/chat';
import { useCanvasStore } from '@/lib/store/canvas';
import { useI18n } from '@/lib/hooks/use-i18n';
import { getOpenMaicVersionPayload } from '@/lib/version';

type AutoTeacherBridgeContext = {
  enabled: true;
  token: string;
  uploadUrl: string;
  sourceOrigin: string;
};

function readAutoTeacherBridgeContext(): AutoTeacherBridgeContext | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem('generationParams');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { autoTeacherBridge?: Partial<AutoTeacherBridgeContext> };
    const bridge = parsed.autoTeacherBridge;
    if (
      bridge?.enabled === true &&
      typeof bridge.token === 'string' &&
      bridge.token.trim() &&
      typeof bridge.uploadUrl === 'string' &&
      bridge.uploadUrl.trim() &&
      typeof bridge.sourceOrigin === 'string' &&
      bridge.sourceOrigin.trim()
    ) {
      return {
        enabled: true,
        token: bridge.token,
        uploadUrl: bridge.uploadUrl,
        sourceOrigin: bridge.sourceOrigin,
      };
    }
  } catch {
    return null;
  }
  return null;
}

function buildTeacherLectureNotes(scenes: Scene[]): LectureNoteEntry[] {
  return scenes
    .filter((scene) => scene.actions && scene.actions.length > 0)
    .map((scene) => ({
      sceneId: scene.id,
      sceneTitle: scene.title,
      sceneOrder: scene.order,
      items: scene
        .actions!.filter(
          (action) =>
            action.type === 'speech' ||
            action.type === 'spotlight' ||
            action.type === 'laser' ||
            action.type === 'play_video' ||
            action.type === 'discussion',
        )
        .map((action) => {
          if (action.type === 'speech') {
            return {
              kind: 'speech' as const,
              text: (action as SpeechAction).text,
            };
          }
          return {
            kind: 'action' as const,
            type: action.type,
            label: action.type === 'discussion' ? (action as DiscussionAction).topic : undefined,
          };
        }),
      completedAt: scene.updatedAt || scene.createdAt || 0,
    }))
    .filter((note) => note.items.length > 0)
    .sort((a, b) => a.sceneOrder - b.sceneOrder);
}

function buildInteractiveConversionRequirement(stageName: string, scenes: Scene[]): string {
  const sceneSummaries = scenes
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((scene) => {
      const speeches = (scene.actions ?? [])
        .filter((action): action is SpeechAction => action.type === 'speech')
        .map((action) => action.text.trim())
        .filter(Boolean);
      const discussions = (scene.actions ?? [])
        .filter((action): action is DiscussionAction => action.type === 'discussion')
        .map((action) => action.topic.trim())
        .filter(Boolean);

      return [
        `${scene.order + 1}. ${scene.title}`,
        speeches.length ? `   现有讲稿：${speeches.slice(0, 3).join('；')}` : undefined,
        discussions.length ? `   现有讨论：${discussions.join('；')}` : undefined,
      ]
        .filter(Boolean)
        .join('\n');
    });

  return [
    '请把下面这份教师课件预览改造成完整互动课堂。',
    '',
    '改造要求：',
    '- 保留当前课件的主题主线、页面顺序和讲稿重点。',
    '- 讲解对象始终是学生：所有解读、speech 和讨论提示都应写成教师在课堂上对学生讲解的自然话术。',
    '- 不要生成面向教师的备课说明、教案建议、授课策略说明或教师视角解读。',
    '- 生成教师、助教和学生角色，让角色围绕学生理解参与讲解、追问、回应和讨论。',
    '- 为关键讲授内容生成适合语音合成的 speech 动作，用于对学生教学。',
    '- 加入播放演示、聚焦、高亮、逐步讲解或视频演示。',
    '- 在合适页面插入 discussion 动作，引导课堂讨论。',
    '- 结尾加入总结反馈、学生反思和课后延伸。',
    '',
    `当前课件：${stageName}`,
    '',
    '当前页面与讲稿：',
    ...sceneSummaries,
  ].join('\n');
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
  const pathname = usePathname();
  const { t } = useI18n();
  const stage = useStageStore((state) => state.stage);
  const mode = useStageStore((state) => state.mode);
  const setMode = useStageStore((state) => state.setMode);
  const scenes = useStageStore((state) => state.scenes);
  const currentSceneId = useStageStore((state) => state.currentSceneId);
  const setCurrentSceneId = useStageStore((state) => state.setCurrentSceneId);
  const generatingOutlines = useStageStore((state) => state.generatingOutlines);
  const failedOutlines = useStageStore((state) => state.failedOutlines);
  const outlines = useStageStore((state) => state.outlines) ?? [];
  const mediaTasks = useMediaGenerationStore((state) => state.tasks);
  const { exporting: isExportingPptx, exportPPTX, exportResourcePack } = useExportPPTX();
  const { exporting: isExportingClassroom, exportClassroomZip } = useExportClassroom();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [retryingOutlineId, setRetryingOutlineId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoTeacherBridge, setAutoTeacherBridge] = useState<AutoTeacherBridgeContext | null>(null);
  const [isSavingAutoTeacher, setIsSavingAutoTeacher] = useState(false);
  const [autoTeacherSaveStatus, setAutoTeacherSaveStatus] = useState<'idle' | 'success' | 'error'>(
    'idle',
  );
  const playbackRef = useRef<HTMLElement>(null);

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
  const lectureNotes = useMemo(() => buildTeacherLectureNotes(scenes), [scenes]);
  const showNotes = currentScene?.type === 'slide';
  const canExport =
    scenes.some((scene) => scene.content.type === 'slide') &&
    generatingOutlines.length === 0 &&
    failedOutlines.length === 0 &&
    Object.values(mediaTasks).every((task) => task.status === 'done' || task.status === 'failed');
  const isExporting = isExportingPptx || isExportingClassroom;
  const canGoPrev = currentSceneIndex > 0;
  const canGoNext = currentSceneIndex < totalSceneCount - 1;
  const fullscreenLabel = isFullscreen ? '退出全屏播放' : '全屏播放';
  const canConvertInteractive = !!stage?.id && scenes.length > 0 && generatingOutlines.length === 0;
  const canEdit = isCurrentSceneEditable({
    currentSceneId,
    sceneCount: scenes.length,
    generatingOutlineCount: generatingOutlines.length,
    hasCurrentScene: !!currentScene,
  });
  const editorEnabled = isMaicEditorEnabled();

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

  const handleToggleEditMode = useCallback(async () => {
    if (!editorEnabled) return;
    if (mode === 'edit') {
      setMode('playback');
      return;
    }
    if (!canEdit) return;
    await preloadEditor();
    setMode('edit');
  }, [canEdit, editorEnabled, mode, setMode]);

  const postAutoTeacherSaveMessage = useCallback(
    (message: Record<string, unknown>) => {
      if (!autoTeacherBridge || typeof window === 'undefined') return;
      window.parent?.postMessage(
        message,
        autoTeacherBridge.sourceOrigin === 'null' ? '*' : autoTeacherBridge.sourceOrigin,
      );
    },
    [autoTeacherBridge],
  );

  const saveAutoTeacherClassroom = useCallback(async () => {
    if (!autoTeacherBridge || !canExport || isSavingAutoTeacher) return;
    setIsSavingAutoTeacher(true);
    setAutoTeacherSaveStatus('idle');
    try {
      const zipResult = await buildClassroomZipBlob();
      if (!zipResult) {
        throw new Error('暂无可保存的课件内容');
      }

      const formData = new FormData();
      formData.append(
        'file',
        new File([zipResult.blob], zipResult.fileName, {
          type: 'application/zip',
        }),
      );

      const response = await fetch(autoTeacherBridge.uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: autoTeacherBridge.token,
        },
        body: formData,
      });
      const responseData = await response.json().catch(() => null);
      if (!response.ok || responseData?.code !== 0 || !responseData?.data?.id) {
        throw new Error(responseData?.message || '保存失败');
      }

      const savedFile = {
        id: responseData.data.id,
        name: responseData.data.name || zipResult.fileName,
        url: responseData.data.url || '',
      };
      setAutoTeacherSaveStatus('success');
      postAutoTeacherSaveMessage({
        type: AUTO_TEACHER_SAVE_SUCCESS_TYPE,
        ...savedFile,
        teachType: inferAutoTeacherTeachType(pathname),
        ...getOpenMaicVersionPayload(),
        raw: responseData,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存失败';
      setAutoTeacherSaveStatus('error');
      postAutoTeacherSaveMessage({
        type: AUTO_TEACHER_SAVE_ERROR_TYPE,
        error: message,
      });
    } finally {
      setIsSavingAutoTeacher(false);
    }
  }, [autoTeacherBridge, canExport, isSavingAutoTeacher, pathname, postAutoTeacherSaveMessage]);

  const convertToInteractiveClassroom = useCallback(() => {
    if (!stage?.id || scenes.length === 0) return;

    const settings = useSettingsStore.getState();
    settings.setAgentMode('auto');
    settings.setTTSEnabled(true);

    const sourceTitle = stage.name || '教师课件';
    const convertedTitle = sourceTitle.endsWith('（互动课堂）')
      ? sourceTitle
      : `${sourceTitle}（互动课堂）`;
    const requirement = buildInteractiveConversionRequirement(sourceTitle, scenes);
    sessionStorage.setItem(
      'generationSession',
      JSON.stringify({
        sessionId: nanoid(),
        requirements: {
          requirement,
          interactiveMode: true,
        },
        pdfText: '',
        pdfImages: [],
        imageStorageIds: [],
        sceneOutlines: null,
        currentStep: 'generating',
        previewPhase: 'preparing',
        teacherMode: true,
        teacherInteractiveConversion: true,
        teacherInteractiveSource: {
          stage,
          scenes,
        },
        originalRequirement: convertedTitle,
      }),
    );
    router.push('/generation-preview');
  }, [router, scenes, stage]);

  const toggleFullscreen = useCallback(async () => {
    const playbackElement = playbackRef.current;
    if (!playbackElement) return;

    try {
      if (document.fullscreenElement === playbackElement) {
        await document.exitFullscreen();
        return;
      }

      await playbackElement.requestFullscreen();
    } catch {
      console.warn('[TeacherClassroomStage] Fullscreen request denied by browser policy');
    }
  }, []);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === playbackRef.current);
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]')) {
        return;
      }

      if (isFullscreen && event.key === 'ArrowLeft') {
        event.preventDefault();
        goToScene(currentSceneIndex - 1);
      } else if (isFullscreen && (event.key === 'ArrowRight' || event.key === ' ')) {
        event.preventDefault();
        goToScene(currentSceneIndex + 1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        goToScene(currentSceneIndex - 1);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        goToScene(currentSceneIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSceneIndex, goToScene, isFullscreen]);

  useEffect(() => {
    if (mode === 'edit' && !canEdit) setMode('playback');
  }, [canEdit, mode, setMode]);

  useEffect(() => {
    setAutoTeacherBridge(readAutoTeacherBridgeContext());
  }, []);

  if (mode === 'edit' && currentScene && editorEnabled) {
    return (
      <div className="relative flex h-screen overflow-hidden bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <EditShell
          scene={currentScene}
          leftRail={<SlideNavRail />}
          commandTrailing={
            <HeaderControls
              mode="edit"
              canEdit={canEdit}
              onToggleEditMode={handleToggleEditMode}
              variant="compact"
            />
          }
        />
        <InteractiveIframeHost />
      </div>
    );
  }

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
          {outlines.length > 0 ? (
            <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              {generatingOutlines.length > 0 ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75 dark:bg-purple-500"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-500 dark:bg-purple-400"></span>
                  </span>
                  <span>
                    正在生成第 {scenes.length + 1} 页 / 共 {outlines.length} 页
                  </span>
                </>
              ) : (
                <span>共 {outlines.length} 页</span>
              )}
            </div>
          ) : (
            scenes.length > 0 && (
              <div className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                共 {scenes.length} 页
              </div>
            )
          )}
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
              <ThemeSwitcher
                className="flex h-8 w-8 items-center justify-center p-0"
                iconClassName="h-4 w-4"
                contentClassName="min-w-[150px]"
                ariaLabel="切换主题"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  disabled={!canExport || isExporting}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white transition-colors dark:border-gray-700 dark:bg-gray-800',
                    canExport && !isExporting
                      ? 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100'
                      : 'cursor-not-allowed text-gray-300 opacity-50 dark:text-gray-600',
                  )}
                  aria-label={isExporting ? '正在导出' : '导出课件'}
                  title={
                    canExport ? (isExporting ? '正在导出' : '导出课件') : '课件生成完成后可导出'
                  }
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="z-[1000] min-w-[210px] overflow-hidden rounded-lg border-gray-200 bg-white p-0 shadow-lg dark:border-gray-700 dark:bg-gray-800"
              >
                <DropdownMenuItem
                  onSelect={exportPPTX}
                  className="cursor-pointer rounded-none px-4 py-2.5 text-gray-700 focus:bg-gray-100 dark:text-gray-200 dark:focus:bg-gray-700"
                >
                  <FileDown className="h-4 w-4 shrink-0 text-gray-400" />
                  <span>PPTX</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={exportResourcePack}
                  className="cursor-pointer rounded-none px-4 py-2.5 text-gray-700 focus:bg-gray-100 dark:text-gray-200 dark:focus:bg-gray-700"
                >
                  <Package className="h-4 w-4 shrink-0 text-gray-400" />
                  <div>
                    <div>资源包</div>
                    <div className="text-[11px] text-gray-400 dark:text-gray-500">
                      PPTX 和互动页面
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={exportClassroomZip}
                  className="cursor-pointer rounded-none px-4 py-2.5 text-gray-700 focus:bg-gray-100 dark:text-gray-200 dark:focus:bg-gray-700"
                >
                  <Archive className="h-4 w-4 shrink-0 text-gray-400" />
                  <div>
                    <div>课堂备份 ZIP</div>
                    <div className="text-[11px] text-gray-400 dark:text-gray-500">
                      课堂数据和媒体文件
                    </div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              onClick={convertToInteractiveClassroom}
              disabled={!canConvertInteractive}
              className={cn(
                'hidden h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors sm:flex',
                canConvertInteractive
                  ? 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/50'
                  : 'cursor-not-allowed border-gray-200 bg-white text-gray-300 opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-600',
              )}
              aria-label="转换为互动课堂"
              title={
                canConvertInteractive ? '转换为互动课堂' : '课件页面生成完成后可转换为互动课堂'
              }
            >
              <WandSparkles className="h-4 w-4" />
              <span>转互动课堂</span>
            </button>
            {editorEnabled && (
              <label
                className={cn(
                  'hidden h-9 shrink-0 items-center gap-2.5 rounded-full border bg-white/60 px-3 shadow-sm backdrop-blur-md transition-colors duration-200 dark:bg-gray-800/60 sm:inline-flex',
                  'border-gray-100/50 dark:border-gray-700/50',
                  !canEdit
                    ? 'cursor-not-allowed opacity-60'
                    : 'cursor-pointer hover:border-violet-400/60 dark:hover:border-violet-500/50',
                )}
                title={canEdit ? t('stage.editCourse') : '课件页面生成完成后可编辑'}
              >
                <span className="select-none text-[11px] font-bold uppercase tracking-[0.14em] tabular-nums text-gray-500 transition-colors duration-200 dark:text-gray-400">
                  {t('edit.proMode')}
                </span>
                <Switch
                  checked={false}
                  onCheckedChange={handleToggleEditMode}
                  disabled={!canEdit}
                  aria-label={t('stage.editCourse')}
                  className="data-[state=checked]:bg-violet-600 dark:data-[state=checked]:bg-violet-500"
                />
              </label>
            )}
            <button
              onClick={toggleFullscreen}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white transition-colors dark:border-gray-700 dark:bg-gray-800',
                isFullscreen
                  ? 'text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/20'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100',
              )}
              aria-label={fullscreenLabel}
              title={fullscreenLabel}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              onClick={() => goToScene(currentSceneIndex - 1)}
              disabled={!canGoPrev}
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
              disabled={!canGoNext}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
              aria-label="下一页"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {showNotes && (
              <button
                onClick={() => setDrawerOpen((open) => !open)}
                className="ml-1 flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                aria-label={drawerOpen ? '收起笔记' : '展开笔记'}
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
          <section
            ref={playbackRef}
            className={cn(
              'relative flex min-w-0 flex-1 items-center justify-center bg-gray-50 p-2 dark:bg-gray-900',
              currentScene?.type === 'interactive'
                ? 'bg-blue-50/30 dark:bg-blue-900/10'
                : 'bg-gray-50/30 dark:bg-gray-900/30',
              isFullscreen && 'h-screen w-screen bg-slate-950 p-4 md:p-8',
            )}
          >
            <div
              className={cn(
                'relative aspect-[16/9] h-full max-h-full max-w-full overflow-hidden rounded-lg bg-white shadow-2xl transition-all duration-700 dark:bg-gray-800',
                currentScene?.type === 'interactive'
                  ? 'shadow-blue-200/50 ring-1 ring-blue-900/5 dark:shadow-blue-900/50 dark:ring-blue-500/10'
                  : 'shadow-gray-200/50 ring-1 ring-gray-950/5 dark:shadow-gray-800/50 dark:ring-white/5',
              )}
            >
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
              {(currentScene || isPendingScene) && totalSceneCount > 0 && (
                <div className="pointer-events-none absolute right-4 top-4 select-none text-4xl font-black tabular-nums text-gray-200 opacity-50 mix-blend-multiply dark:text-gray-700 dark:mix-blend-screen">
                  {(currentSceneIndex + 1).toString().padStart(2, '0')}
                </div>
              )}
            </div>
            {isFullscreen && (
              <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-4">
                <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/80 px-3 py-2 text-white shadow-2xl backdrop-blur-md">
                  <button
                    onClick={() => goToScene(currentSceneIndex - 1)}
                    disabled={!canGoPrev}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label="上一页"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="min-w-16 text-center text-sm font-medium tabular-nums text-white/80">
                    {totalSceneCount > 0 ? currentSceneIndex + 1 : 0} / {totalSceneCount}
                  </span>
                  <button
                    onClick={() => goToScene(currentSceneIndex + 1)}
                    disabled={!canGoNext}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label="下一页"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="mx-1 h-5 w-px bg-white/15" />
                  <button
                    onClick={toggleFullscreen}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label="退出全屏播放"
                    title="退出全屏播放"
                  >
                    <Minimize2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
            {autoTeacherBridge && !isFullscreen && (
              <div className="absolute bottom-5 right-5 z-20">
                <button
                  type="button"
                  onClick={saveAutoTeacherClassroom}
                  disabled={!canExport || isSavingAutoTeacher}
                  className={cn(
                    'flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold shadow-lg backdrop-blur-md transition-colors',
                    canExport && !isSavingAutoTeacher
                      ? autoTeacherSaveStatus === 'success'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/70 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : autoTeacherSaveStatus === 'error'
                          ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/70 dark:bg-red-950/60 dark:text-red-300'
                          : 'border-gray-200 bg-white/90 text-gray-700 hover:bg-white hover:text-gray-950 dark:border-gray-700 dark:bg-gray-900/90 dark:text-gray-200 dark:hover:bg-gray-800'
                      : 'cursor-not-allowed border-gray-200 bg-white/70 text-gray-300 opacity-70 dark:border-gray-700 dark:bg-gray-900/70 dark:text-gray-600',
                  )}
                  title={canExport ? '保存到父项目' : '课件生成完成后可保存'}
                  aria-label="保存到父项目"
                >
                  {isSavingAutoTeacher ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>
                    {isSavingAutoTeacher
                      ? '保存中'
                      : autoTeacherSaveStatus === 'success'
                        ? '已保存'
                        : autoTeacherSaveStatus === 'error'
                          ? '重新保存'
                          : '保存'}
                  </span>
                </button>
              </div>
            )}
          </section>

          {showNotes && (
            <aside
              aria-hidden={!drawerOpen}
              className={cn(
                'hidden shrink-0 border-l border-gray-200 bg-white transition-[width] duration-200 dark:border-gray-800 dark:bg-gray-900 md:flex md:flex-col',
                drawerOpen
                  ? 'basis-[22%] min-w-[18%] max-w-[24%]'
                  : 'w-0 overflow-hidden border-l-0',
              )}
            >
              {drawerOpen && (
                <>
                  <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-100 px-5 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-gray-900 dark:text-gray-100" />
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        笔记
                      </h3>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      第 {currentSceneIndex + 1} 页
                    </span>
                  </div>
                  <LectureNotesView notes={lectureNotes} currentSceneId={currentScene?.id} />
                </>
              )}
            </aside>
          )}
        </div>
      </main>
      <InteractiveIframeHost />
    </div>
  );
}
