'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { buildClassroomZipBlob } from '@/lib/export/use-export-classroom';
import { getOpenMaicVersionPayload } from '@/lib/version';
import {
  AUTO_TEACHER_SAVE_ERROR_TYPE,
  AUTO_TEACHER_SAVE_SUCCESS_TYPE,
  inferAutoTeacherTeachType,
} from '@/lib/auto-teacher/protocol';

export type AutoTeacherBridgeContext = {
  enabled: true;
  token: string;
  uploadUrl: string;
  sourceOrigin: string;
};

type SaveStatus = 'idle' | 'success' | 'error';

type UploadResponse = {
  code?: number;
  message?: string;
  data?: {
    id?: string;
    name?: string;
    url?: string;
  };
};

export function readAutoTeacherBridgeContext(): AutoTeacherBridgeContext | null {
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

export function useAutoTeacherClassroomSave(
  canSave: boolean,
  options: { requireAutoTeacherQuery?: boolean } = {},
) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requireAutoTeacherQuery = options.requireAutoTeacherQuery ?? true;
  const [bridge, setBridge] = useState<AutoTeacherBridgeContext | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  useEffect(() => {
    if (
      requireAutoTeacherQuery &&
      searchParams.get('autoTeacher') !== '1' &&
      searchParams.get('autoImport') !== '1'
    ) {
      setBridge(null);
      return;
    }
    setBridge(readAutoTeacherBridgeContext());
  }, [requireAutoTeacherQuery, searchParams]);

  const postSaveMessage = useCallback(
    (message: Record<string, unknown>) => {
      if (!bridge || typeof window === 'undefined') return;
      window.parent?.postMessage(
        message,
        bridge.sourceOrigin === 'null' ? '*' : bridge.sourceOrigin,
      );
    },
    [bridge],
  );

  const saveClassroom = useCallback(async () => {
    if (!bridge || !canSave || isSaving) return;
    setIsSaving(true);
    setSaveStatus('idle');

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

      const response = await fetch(bridge.uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: bridge.token,
        },
        body: formData,
      });
      const responseData = (await response.json().catch(() => null)) as UploadResponse | null;
      if (!response.ok || responseData?.code !== 0 || !responseData?.data?.id) {
        throw new Error(responseData?.message || '保存失败');
      }

      const savedFile = {
        id: responseData.data.id,
        name: responseData.data.name || zipResult.fileName,
        url: responseData.data.url || '',
      };
      setSaveStatus('success');
      postSaveMessage({
        type: AUTO_TEACHER_SAVE_SUCCESS_TYPE,
        ...savedFile,
        teachType: inferAutoTeacherTeachType(pathname),
        ...getOpenMaicVersionPayload(),
        raw: responseData,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存失败';
      setSaveStatus('error');
      postSaveMessage({
        type: AUTO_TEACHER_SAVE_ERROR_TYPE,
        error: message,
      });
    } finally {
      setIsSaving(false);
    }
  }, [bridge, canSave, isSaving, pathname, postSaveMessage]);

  return {
    bridge,
    canSave: !!bridge && canSave && !isSaving,
    isSaving,
    saveStatus,
    saveClassroom,
  };
}
