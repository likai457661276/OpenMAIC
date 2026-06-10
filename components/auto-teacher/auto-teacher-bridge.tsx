'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import { apiPath, appPath } from '@/lib/app-paths';
import { useSettingsStore } from '@/lib/store/settings';
import {
  AUTO_TEACHER_ERROR_TYPE,
  AUTO_TEACHER_BRIDGE_READY_TYPE,
  AUTO_TEACHER_READY_TYPE,
  AUTO_TEACHER_STATUS_TYPE,
  buildAutoTeacherRequirement,
  isOriginAllowed,
  parseAllowedOrigins,
  parseAutoTeacherMessage,
  type AutoTeacherStage,
} from '@/lib/auto-teacher/protocol';
import { MAX_PDF_CONTENT_CHARS } from '@/lib/constants/generation';
import type { GenerationSessionState } from '@/app/generation-preview/types';

type ParentReply =
  | { type: typeof AUTO_TEACHER_STATUS_TYPE; stage: AutoTeacherStage; warning?: string }
  | { type: typeof AUTO_TEACHER_BRIDGE_READY_TYPE }
  | { type: typeof AUTO_TEACHER_READY_TYPE; nextPath: string; warning?: string }
  | { type: typeof AUTO_TEACHER_ERROR_TYPE; error: string; details?: string };

function replyToParent(event: MessageEvent, message: ParentReply) {
  const target = event.source;
  if (!target || typeof target.postMessage !== 'function') return;
  (target as Window).postMessage(message, event.origin === 'null' ? '*' : event.origin);
}

export function AutoTeacherBridge() {
  const router = useRouter();
  const processingRef = useRef(false);
  const statusRef = useRef<AutoTeacherStage | 'idle'>('idle');
  const [status, setStatus] = useState<AutoTeacherStage | 'idle'>('idle');

  useEffect(() => {
    const allowedOrigins = parseAllowedOrigins(
      process.env.NEXT_PUBLIC_AUTO_TEACHER_ALLOWED_ORIGINS,
    );

    const setBridgeStatus = (nextStatus: AutoTeacherStage | 'idle') => {
      statusRef.current = nextStatus;
      setStatus(nextStatus);
    };

    const handleMessage = async (event: MessageEvent) => {
      let warning: string | undefined;
      try {
        const payload = parseAutoTeacherMessage(event.data);
        warning = payload.warning;

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
            stage: statusRef.current === 'idle' ? 'received' : statusRef.current,
          });
          return;
        }

        processingRef.current = true;
        setBridgeStatus('received');
        replyToParent(event, { type: AUTO_TEACHER_STATUS_TYPE, stage: 'received', warning });

        const settings = useSettingsStore.getState();
        await settings.fetchServerProviders();
        useSettingsStore.getState().setModel(payload.providerId, payload.modelId);
        useSettingsStore.getState().setImageGenerationEnabled(false);
        useSettingsStore.getState().setVideoGenerationEnabled(false);
        useSettingsStore.getState().setTTSEnabled(false);

        setBridgeStatus('parsing_pdf');
        replyToParent(event, { type: AUTO_TEACHER_STATUS_TYPE, stage: 'parsing_pdf', warning });
        const parseResponse = await fetch(apiPath('/api/auto-teacher/parse-pdf-url'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_url: payload.fileUrl, upload_url: payload.uploadUrl }),
        });
        const parseResult = await parseResponse.json().catch(() => null);
        if (!parseResponse.ok || !parseResult?.success || !parseResult.data) {
          throw new Error(parseResult?.error || 'PDF parsing failed');
        }

        const rawPdfText = String(parseResult.data.text || '');
        const pdfText =
          rawPdfText.length > MAX_PDF_CONTENT_CHARS
            ? rawPdfText.substring(0, MAX_PDF_CONTENT_CHARS)
            : rawPdfText;

        setBridgeStatus('preparing_session');
        replyToParent(event, {
          type: AUTO_TEACHER_STATUS_TYPE,
          stage: 'preparing_session',
          warning,
        });

        const requirement = buildAutoTeacherRequirement(pdfText);
        const sessionState: GenerationSessionState = {
          sessionId: nanoid(),
          requirements: {
            requirement,
            webSearch: false,
            interactiveMode: false,
          },
          pdfText,
          pdfImages: [],
          imageStorageIds: [],
          imageMapping: {},
          sceneOutlines: null,
          currentStep: 'generating',
          previewPhase: 'preparing',
          teacherMode: true,
          autoTeacherBridge: {
            enabled: true,
            token: payload.token,
            uploadUrl: payload.uploadUrl,
            sourceOrigin: event.origin,
          },
          originalRequirement: requirement,
        };

        sessionStorage.setItem('generationSession', JSON.stringify(sessionState));

        const nextPath = appPath('/generation-preview');
        setBridgeStatus('redirecting');
        replyToParent(event, {
          type: AUTO_TEACHER_STATUS_TYPE,
          stage: 'redirecting',
          warning,
        });
        replyToParent(event, { type: AUTO_TEACHER_READY_TYPE, nextPath, warning });
        router.push('/generation-preview');
      } catch (error) {
        processingRef.current = false;
        const message = error instanceof Error ? error.message : 'Auto teacher generation failed';
        replyToParent(event, {
          type: AUTO_TEACHER_ERROR_TYPE,
          error: message,
        });
        setBridgeStatus('idle');
      }
    };

    window.addEventListener('message', handleMessage);
    window.parent?.postMessage({ type: AUTO_TEACHER_BRIDGE_READY_TYPE }, '*');
    return () => window.removeEventListener('message', handleMessage);
  }, [router]);

  return (
    <main
      aria-live="polite"
      className="min-h-[100dvh] bg-background text-foreground"
      data-auto-teacher-status={status}
    />
  );
}
