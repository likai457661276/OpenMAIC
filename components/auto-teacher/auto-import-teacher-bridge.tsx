'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, Loader2 } from 'lucide-react';
import { apiPath, appPath } from '@/lib/app-paths';
import { useImportClassroom } from '@/lib/import/use-import-classroom';
import { db } from '@/lib/utils/database';
import { listStages } from '@/lib/utils/stage-storage';
import {
  AUTO_TEACHER_BRIDGE_READY_TYPE,
  AUTO_TEACHER_ERROR_TYPE,
  AUTO_TEACHER_READY_TYPE,
  AUTO_TEACHER_STATUS_TYPE,
  isAutoTeacherGenerateMessage,
  isOriginAllowed,
  parseAllowedOrigins,
  parseAutoImportTeacherMessage,
  type AutoImportTeacherStage,
  type AutoTeacherTeachType,
} from '@/lib/auto-teacher/protocol';

type ParentReply =
  | { type: typeof AUTO_TEACHER_STATUS_TYPE; stage: AutoImportTeacherStage }
  | { type: typeof AUTO_TEACHER_BRIDGE_READY_TYPE }
  | { type: typeof AUTO_TEACHER_READY_TYPE; nextPath: string }
  | { type: typeof AUTO_TEACHER_ERROR_TYPE; error: string };

function replyToParent(event: MessageEvent, message: ParentReply) {
  const target = event.source;
  if (!target || typeof target.postMessage !== 'function') return;
  (target as Window).postMessage(message, event.origin === 'null' ? '*' : event.origin);
}

function normalizeZipFileName(fileName: string): string {
  const normalized = fileName.trim().replace(/[\\/]/g, '-');
  if (!normalized) return '';
  return normalized.toLowerCase().endsWith('.zip') ? normalized : `${normalized}.maic.zip`;
}

function getImportFileName(fileName: string | undefined, zipUrl: string): string {
  const payloadFileName = normalizeZipFileName(fileName || '');
  if (payloadFileName) return payloadFileName;

  try {
    const url = new URL(zipUrl);
    const name = url.pathname.split('/').filter(Boolean).pop();
    return name?.toLowerCase().endsWith('.zip') ? name : 'auto-import-classroom.maic.zip';
  } catch {
    return 'auto-import-classroom.maic.zip';
  }
}

function dispatchFileInputChange(input: HTMLInputElement, file: File) {
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  input.files = dataTransfer.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function stageLabel(stage: AutoImportTeacherStage): string {
  switch (stage) {
    case 'received':
      return '已收到课件导入任务';
    case 'downloading_zip':
      return '正在下载课件 ZIP';
    case 'parsing':
      return '正在解析课件包';
    case 'validating':
      return '正在校验课件内容';
    case 'writingMedia':
      return '正在写入媒体资源';
    case 'writingCourse':
      return '正在导入课堂数据';
    case 'redirecting':
      return '正在打开课件详情';
    case 'idle':
    default:
      return '等待父项目传入课件';
  }
}

function resetLocalStatus(
  statusRef: MutableRefObject<AutoImportTeacherStage>,
  setStatus: (status: AutoImportTeacherStage) => void,
) {
  statusRef.current = 'idle';
  setStatus('idle');
}

export function AutoImportTeacherBridge() {
  const router = useRouter();
  const processingRef = useRef(false);
  const statusRef = useRef<AutoImportTeacherStage>('idle');
  const messageEventRef = useRef<MessageEvent | null>(null);
  const existingStageIdsRef = useRef<Set<string>>(new Set());
  const teachTypeRef = useRef<AutoTeacherTeachType>('teacher');
  const [status, setStatus] = useState<AutoImportTeacherStage>('idle');
  const [error, setError] = useState<string | null>(null);

  const setBridgeStatus = useCallback((nextStatus: AutoImportTeacherStage) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
    const event = messageEventRef.current;
    if (event) {
      replyToParent(event, { type: AUTO_TEACHER_STATUS_TYPE, stage: nextStatus });
    }
  }, []);

  const handleImportSuccess = useCallback(async () => {
    const event = messageEventRef.current;
    try {
      const stages = await listStages();
      const importedStage = stages
        .filter((stage) => !existingStageIdsRef.current.has(stage.id))
        .sort((a, b) => b.updatedAt - a.updatedAt)[0];

      if (!importedStage) {
        throw new Error('Imported classroom was not found');
      }

      const teachType = teachTypeRef.current;
      await db.stages.update(importedStage.id, {
        teacherMode: teachType === 'teacher',
        updatedAt: Date.now(),
      });

      setBridgeStatus('redirecting');
      const routePath =
        teachType === 'teacher'
          ? `/classroom/teacher/${importedStage.id}?autoImport=1`
          : `/classroom/${importedStage.id}?autoImport=1`;
      const nextPath = appPath(routePath);
      if (event) {
        replyToParent(event, { type: AUTO_TEACHER_READY_TYPE, nextPath });
      }
      router.replace(routePath);
    } catch (successError) {
      const message = successError instanceof Error ? successError.message : 'Import failed';
      setError(message);
      if (event) {
        replyToParent(event, { type: AUTO_TEACHER_ERROR_TYPE, error: message });
      }
      processingRef.current = false;
      resetLocalStatus(statusRef, setStatus);
    }
  }, [router, setBridgeStatus]);

  const { fileInputRef, handleFileChange, phase } = useImportClassroom(handleImportSuccess);

  useEffect(() => {
    if (phase === 'idle' || phase === 'done') return;
    setBridgeStatus(phase);
  }, [phase, setBridgeStatus]);

  useEffect(() => {
    const allowedOrigins = parseAllowedOrigins(
      process.env.NEXT_PUBLIC_AUTO_TEACHER_ALLOWED_ORIGINS,
    );

    const handleMessage = async (event: MessageEvent) => {
      if (!isAutoTeacherGenerateMessage(event.data)) return;

      try {
        const payload = parseAutoImportTeacherMessage(event.data);

        if (
          !isOriginAllowed({
            origin: event.origin,
            allowedOrigins,
            nodeEnv: process.env.NODE_ENV,
          })
        ) {
          throw new Error('Message origin is not allowed');
        }

        if (processingRef.current) {
          replyToParent(event, {
            type: AUTO_TEACHER_STATUS_TYPE,
            stage: statusRef.current,
          });
          return;
        }

        const input = fileInputRef.current;
        if (!input) {
          throw new Error('Import input is not ready');
        }

        processingRef.current = true;
        messageEventRef.current = event;
        teachTypeRef.current = payload.teachType;
        setError(null);

        existingStageIdsRef.current = new Set((await listStages()).map((stage) => stage.id));

        setBridgeStatus('received');
        setBridgeStatus('downloading_zip');
        const response = await fetch(apiPath('/api/auto-teacher/download-zip'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ zip_url: payload.zipUrl }),
        });
        if (!response.ok) {
          throw new Error(`ZIP download failed: ${response.status}`);
        }

        const blob = await response.blob();
        const file = new File([blob], getImportFileName(payload.fileName, payload.zipUrl), {
          type: blob.type || 'application/zip',
        });
        dispatchFileInputChange(input, file);
      } catch (messageError) {
        processingRef.current = false;
        const message =
          messageError instanceof Error ? messageError.message : 'Auto import teacher failed';
        setError(message);
        replyToParent(event, {
          type: AUTO_TEACHER_ERROR_TYPE,
          error: message,
        });
        resetLocalStatus(statusRef, setStatus);
      }
    };

    window.addEventListener('message', handleMessage);
    window.parent?.postMessage({ type: AUTO_TEACHER_BRIDGE_READY_TYPE }, '*');
    return () => window.removeEventListener('message', handleMessage);
  }, [fileInputRef, setBridgeStatus]);

  const label = useMemo(() => stageLabel(status), [status]);

  return (
    <main
      aria-live="polite"
      className="flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(124,92,255,0.18),transparent_34%),linear-gradient(135deg,#f8fbff_0%,#f4f1ff_100%)] px-6 text-slate-800"
      data-auto-import-teacher-status={status}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,.maic.zip,application/zip"
        className="hidden"
        onChange={handleFileChange}
      />

      <section className="relative flex w-full max-w-md flex-col items-center text-center">
        <div className="absolute -top-24 h-48 w-48 rounded-full bg-violet-200/30 blur-3xl" />
        <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/70 bg-white/75 shadow-[0_24px_70px_-28px_rgba(96,65,180,0.55)] backdrop-blur-xl">
          {status === 'idle' && !error ? (
            <Archive className="h-8 w-8 text-violet-500" />
          ) : (
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          )}
        </div>
        <h1 className="text-xl font-semibold tracking-normal text-slate-900">
          {error ? '课件导入失败' : label}
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">
          {error || '请保持当前页面打开，系统会自动完成课件导入并进入详情页。'}
        </p>
        <div className="mt-8 h-1.5 w-56 overflow-hidden rounded-full bg-white/70">
          <div className="h-full w-full animate-pulse rounded-full bg-violet-500" />
        </div>
      </section>
    </main>
  );
}
