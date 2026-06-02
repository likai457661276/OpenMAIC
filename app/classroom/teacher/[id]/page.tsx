'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { TeacherClassroomStage } from '@/components/teacher/teacher-classroom-stage';
import { ThemeProvider } from '@/lib/hooks/use-theme';
import { MediaStageProvider } from '@/lib/contexts/media-stage-context';
import { useStageStore } from '@/lib/store';
import { useMediaGenerationStore } from '@/lib/store/media-generation';
import { useWhiteboardHistoryStore } from '@/lib/store/whiteboard-history';
import { useSceneGenerator } from '@/lib/hooks/use-scene-generator';
import { loadImageMapping } from '@/lib/utils/image-storage';
import { generateMediaForOutlines } from '@/lib/media/media-orchestrator';
import { apiPath } from '@/lib/app-paths';
import { createLogger } from '@/lib/logger';

const log = createLogger('TeacherClassroom');

export default function TeacherClassroomPage() {
  const params = useParams();
  const classroomId = params?.id as string;
  const { loadFromStorage } = useStageStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generationStartedRef = useRef(false);

  const { generateRemaining, retrySingleOutline, stop } = useSceneGenerator({
    onComplete: () => {
      log.info('[TeacherClassroom] All scenes generated');
    },
  });

  const loadClassroom = useCallback(async () => {
    try {
      await loadFromStorage(classroomId);

      if (!useStageStore.getState().stage) {
        try {
          const res = await fetch(apiPath(`/api/classroom?id=${encodeURIComponent(classroomId)}`));
          if (res.ok) {
            const json = await res.json();
            if (json.success && json.classroom) {
              const { stage, scenes } = json.classroom;
              useStageStore.getState().setStage(stage);
              useStageStore.setState({
                scenes,
                currentSceneId: scenes[0]?.id ?? null,
              });
            }
          }
        } catch (fetchErr) {
          log.warn('Server-side storage fetch failed:', fetchErr);
        }
      }

      await useMediaGenerationStore.getState().restoreFromDB(classroomId);
    } catch (loadError) {
      log.error('Failed to load teacher classroom:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load classroom');
    } finally {
      setLoading(false);
    }
  }, [classroomId, loadFromStorage]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    generationStartedRef.current = false;

    const mediaStore = useMediaGenerationStore.getState();
    mediaStore.revokeObjectUrls();
    useMediaGenerationStore.setState({ tasks: {} });
    useWhiteboardHistoryStore.getState().clearHistory();

    loadClassroom();

    return () => {
      stop();
    };
  }, [classroomId, loadClassroom, stop]);

  useEffect(() => {
    if (loading || error || generationStartedRef.current) return;

    const state = useStageStore.getState();
    const { outlines, scenes, stage } = state;
    const completedOrders = new Set(scenes.map((scene) => scene.order));
    const hasPending = outlines.some((outline) => !completedOrders.has(outline.order));

    if (hasPending && stage) {
      generationStartedRef.current = true;
      const genParamsStr = sessionStorage.getItem('generationParams');
      const genParams = genParamsStr ? JSON.parse(genParamsStr) : {};
      const storageIds = (genParams.pdfImages || [])
        .map((img: { storageId?: string }) => img.storageId)
        .filter(Boolean);

      loadImageMapping(storageIds).then((imageMapping) => {
        generateRemaining({
          pdfImages: genParams.pdfImages,
          imageMapping,
          stageInfo: {
            name: stage.name || '',
            description: stage.description,
            style: stage.style,
          },
          agents: genParams.agents,
          userProfile: genParams.userProfile,
          languageDirective: genParams.languageDirective || stage.languageDirective,
        });
      });
    } else if (outlines.length > 0 && stage) {
      generationStartedRef.current = true;
      generateMediaForOutlines(outlines, stage.id).catch((mediaError) => {
        log.warn('[TeacherClassroom] Media generation resume error:', mediaError);
      });
    }
  }, [loading, error, generateRemaining]);

  return (
    <ThemeProvider>
      <MediaStageProvider value={classroomId}>
        {loading ? (
          <div className="flex h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">
            Loading classroom...
          </div>
        ) : error ? (
          <div className="flex h-screen items-center justify-center bg-slate-100">
            <div className="text-center">
              <p className="mb-4 text-sm text-red-500">Error: {error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  loadClassroom();
                }}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <TeacherClassroomStage onRetryOutline={retrySingleOutline} />
        )}
      </MediaStageProvider>
    </ThemeProvider>
  );
}
