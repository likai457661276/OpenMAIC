import { MAX_PDF_CONTENT_CHARS } from '@/lib/constants/generation';
import {
  getAutoTeacherAllowedOrigins,
  getAutoTeacherAllowedPdfOrigins,
  parseOriginList,
} from './origins';

export const AUTO_TEACHER_MESSAGE_TYPE = 'AUTO_TEACHER_GENERATE';
export const AUTO_TEACHER_STATUS_TYPE = 'AUTO_TEACHER_STATUS';
export const AUTO_TEACHER_READY_TYPE = 'AUTO_TEACHER_READY';
export const AUTO_TEACHER_BRIDGE_READY_TYPE = 'AUTO_TEACHER_BRIDGE_READY';
export const AUTO_TEACHER_ERROR_TYPE = 'AUTO_TEACHER_ERROR';
export const AUTO_TEACHER_SAVE_SUCCESS_TYPE = 'AUTO_TEACHER_SAVE_SUCCESS';
export const AUTO_TEACHER_SAVE_ERROR_TYPE = 'AUTO_TEACHER_SAVE_ERROR';

export const AUTO_TEACHER_DEFAULT_MODEL = 'qwen:deepseek-v4-flash';
export const AUTO_TEACHER_ALLOWED_MODELS = ['qwen:qwen3.7-plus', 'qwen:deepseek-v4-flash'] as const;
export const AUTO_TEACHER_MAX_PDF_SIZE_BYTES = 50 * 1024 * 1024;

export type AutoTeacherModel = (typeof AUTO_TEACHER_ALLOWED_MODELS)[number];
export type AutoTeacherStage = 'received' | 'parsing_pdf' | 'preparing_session' | 'redirecting';
export type AutoTeacherTeachType = 'teacher' | 'classroom';
export type AutoImportTeacherStage =
  | 'idle'
  | 'received'
  | 'downloading_zip'
  | 'parsing'
  | 'validating'
  | 'writingMedia'
  | 'writingCourse'
  | 'redirecting';

export interface AutoTeacherGenerateMessage {
  type: typeof AUTO_TEACHER_MESSAGE_TYPE;
  file_url: string;
  courseware_name?: string;
  token: string;
  upload_url: string;
  model?: string;
  prompt?: string;
}

export interface AutoTeacherPayload {
  fileUrl: string;
  token: string;
  uploadUrl: string;
  coursewareName?: string;
  prompt?: string;
  model: AutoTeacherModel;
  providerId: 'qwen';
  modelId: 'qwen3.7-plus' | 'deepseek-v4-flash';
  warning?: string;
}

export interface AutoImportTeacherPayload {
  zipUrl: string;
  teachType: AutoTeacherTeachType;
  fileName?: string;
}

export function inferAutoTeacherTeachType(pathname: string): AutoTeacherTeachType {
  return pathname.includes('/classroom/teacher/') ? 'teacher' : 'classroom';
}

export function shouldHideEmbeddedClassroomBackButton(params: {
  autoImport?: string | null;
  autoTeacher?: string | null;
}): boolean {
  return params.autoImport === '1' || params.autoTeacher === '1';
}

function parseAutoTeacherModelString(model: AutoTeacherModel): {
  providerId: 'qwen';
  modelId: 'qwen3.7-plus' | 'deepseek-v4-flash';
} {
  const [providerId, modelId] = model.split(':');
  return {
    providerId: providerId as 'qwen',
    modelId: modelId as 'qwen3.7-plus' | 'deepseek-v4-flash',
  };
}

export function parseAllowedOrigins(value: string | undefined): string[] {
  return getAutoTeacherAllowedOrigins({ configuredOrigins: value });
}

export { getAutoTeacherAllowedOrigins, getAutoTeacherAllowedPdfOrigins, parseOriginList };

export function isOriginAllowed(params: {
  origin: string;
  allowedOrigins: string[];
  nodeEnv?: string;
}): boolean {
  const { origin, allowedOrigins, nodeEnv = process.env.NODE_ENV } = params;
  if (allowedOrigins.length === 0) {
    return nodeEnv !== 'production';
  }
  return allowedOrigins.includes(origin);
}

export function isAutoTeacherGenerateMessage(data: unknown): boolean {
  return Boolean(
    data &&
    typeof data === 'object' &&
    (data as { type?: unknown }).type === AUTO_TEACHER_MESSAGE_TYPE,
  );
}

export function normalizeAutoTeacherModel(model: unknown): {
  model: AutoTeacherModel;
  providerId: 'qwen';
  modelId: 'qwen3.7-plus' | 'deepseek-v4-flash';
  warning?: string;
} {
  if (typeof model === 'string') {
    const normalized = model.trim();
    if ((AUTO_TEACHER_ALLOWED_MODELS as readonly string[]).includes(normalized)) {
      return {
        model: normalized as AutoTeacherModel,
        ...parseAutoTeacherModelString(normalized as AutoTeacherModel),
      };
    }
    if (normalized) {
      return {
        model: AUTO_TEACHER_DEFAULT_MODEL,
        ...parseAutoTeacherModelString(AUTO_TEACHER_DEFAULT_MODEL),
        warning: `Unsupported model "${normalized}", falling back to ${AUTO_TEACHER_DEFAULT_MODEL}`,
      };
    }
  }
  return {
    model: AUTO_TEACHER_DEFAULT_MODEL,
    ...parseAutoTeacherModelString(AUTO_TEACHER_DEFAULT_MODEL),
  };
}

export function parseAutoTeacherMessage(data: unknown): AutoTeacherPayload {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid message payload');
  }

  const payload = data as Partial<AutoTeacherGenerateMessage>;
  if (payload.type !== AUTO_TEACHER_MESSAGE_TYPE) {
    throw new Error('Unsupported message type');
  }

  if (typeof payload.file_url !== 'string' || !payload.file_url.trim()) {
    throw new Error('Missing required field: file_url');
  }

  let url: URL;
  try {
    url = new URL(payload.file_url.trim());
  } catch {
    throw new Error('Invalid file_url');
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Only HTTP(S) file_url is allowed');
  }

  if (typeof payload.token !== 'string' || !payload.token.trim()) {
    throw new Error('Missing required field: token');
  }

  if (typeof payload.upload_url !== 'string' || !payload.upload_url.trim()) {
    throw new Error('Missing required field: upload_url');
  }

  let uploadUrl: URL;
  try {
    uploadUrl = new URL(payload.upload_url.trim());
  } catch {
    throw new Error('Invalid upload_url');
  }

  if (uploadUrl.protocol !== 'https:' && uploadUrl.protocol !== 'http:') {
    throw new Error('Only HTTP(S) upload_url is allowed');
  }

  const coursewareName =
    typeof payload.courseware_name === 'string'
      ? cleanPdfTitleCandidate(payload.courseware_name)
      : '';
  const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
  const { model, providerId, modelId, warning } = normalizeAutoTeacherModel(payload.model);
  return {
    fileUrl: url.toString(),
    token: payload.token.trim(),
    uploadUrl: uploadUrl.toString(),
    ...(coursewareName ? { coursewareName } : {}),
    ...(prompt ? { prompt } : {}),
    model,
    providerId,
    modelId,
    warning,
  };
}

export function parseAutoImportTeacherMessage(data: unknown): AutoImportTeacherPayload {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid message payload');
  }

  const payload = data as {
    type?: unknown;
    zip_url?: unknown;
    zipUrl?: unknown;
    zipurl?: unknown;
    teachType?: unknown;
    fileName?: unknown;
  };
  if (payload.type !== AUTO_TEACHER_MESSAGE_TYPE) {
    throw new Error('Unsupported message type');
  }

  const zipUrlValue = payload.zip_url ?? payload.zipUrl ?? payload.zipurl;
  if (typeof zipUrlValue !== 'string' || !zipUrlValue.trim()) {
    throw new Error('Missing required field: zip_url');
  }

  let zipUrl: URL;
  try {
    zipUrl = new URL(zipUrlValue.trim());
  } catch {
    throw new Error('Invalid zip_url');
  }

  if (zipUrl.protocol !== 'https:' && zipUrl.protocol !== 'http:') {
    throw new Error('Only HTTP(S) zip_url is allowed');
  }

  if (payload.teachType !== 'teacher' && payload.teachType !== 'classroom') {
    throw new Error('Invalid teachType');
  }

  return {
    zipUrl: zipUrl.toString(),
    teachType: payload.teachType,
    ...(typeof payload.fileName === 'string' && payload.fileName.trim()
      ? { fileName: payload.fileName.trim() }
      : {}),
  };
}

export function buildAutoTeacherRequirement(pdfText: string, customPrompt?: string): string {
  const textLength = Math.min(pdfText.length, MAX_PDF_CONTENT_CHARS);
  const defaultPrompt = [
    '请根据外部系统传入的 PDF 内容，生成教师可直接使用的教案与互动课件流程。',
    '这是自动教案入口：不要要求用户补充输入，不要依赖图片生成、视频生成或 TTS 语音合成。',
    '输出应面向教师备课，覆盖教学目标、重点难点、课堂流程、活动设计、练习/测验建议与可演示的课堂内容。',
    '如果 PDF 中包含章节结构、例题、实验、案例或评价要求，请优先转化为结构化教学环节。',
  ].join('\n');
  return [
    customPrompt?.trim() || defaultPrompt,
    `PDF 文本已解析并传入后续生成链路，当前可用文本长度约 ${textLength} 字符。`,
  ].join('\n');
}

function cleanPdfTitleCandidate(value: string): string {
  return value
    .replace(/!\[[^\]]*]\([^)]+\)/g, '')
    .replace(/\[[^\]]*]\([^)]+\)/g, '')
    .replace(/^#{1,6}\s*/, '')
    .replace(/^[\s>*-]*(?:\d{1,3}\s*[.、．:：-]\s+|\d{1,3}\s+)/, '')
    .replace(/^(标题|题目|课题|主题|章节|章标题|课程标题|单元标题)\s*[:：]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[。；;，,、\s]+$/, '');
}

function isUsablePdfTitleCandidate(value: string): boolean {
  if (value.length < 4 || value.length > 80) return false;
  if (/^(pdf|document|untitled|目录|contents?|第?\s*\d+\s*页)$/i.test(value)) return false;
  if (/^(img|image|figure|table|图|表)\s*[_\d-]*$/i.test(value)) return false;
  return /[\p{L}\p{N}]/u.test(value);
}

export function inferAutoTeacherPdfTitle(pdfText: string): string {
  const lines = pdfText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 80);

  const labeledTitle = lines
    .map((line) =>
      line.match(/^(标题|题目|课题|主题|章节|章标题|课程标题|单元标题)\s*[:：]\s*(.+)$/),
    )
    .find((match): match is RegExpMatchArray => {
      const candidate = cleanPdfTitleCandidate(match?.[2] || '');
      return isUsablePdfTitleCandidate(candidate);
    });
  if (labeledTitle) return cleanPdfTitleCandidate(labeledTitle[2]);

  const headingTitle = lines
    .filter((line) => /^#{1,3}\s+\S/.test(line))
    .map(cleanPdfTitleCandidate)
    .find(isUsablePdfTitleCandidate);
  if (headingTitle) return headingTitle;

  const firstContentTitle = lines.map(cleanPdfTitleCandidate).find(isUsablePdfTitleCandidate);
  return firstContentTitle || 'PDF 课件';
}
