import { describe, expect, it } from 'vitest';
import {
  AUTO_TEACHER_MESSAGE_TYPE,
  buildAutoTeacherRequirement,
  isOriginAllowed,
  normalizeAutoTeacherModel,
  parseAllowedOrigins,
  parseAutoTeacherMessage,
} from '@/lib/auto-teacher/protocol';

describe('auto-teacher protocol', () => {
  it('parses allowed origins from comma-separated env value', () => {
    expect(parseAllowedOrigins('https://a.example, https://b.example ,,')).toEqual([
      'https://a.example',
      'https://b.example',
    ]);
  });

  it('allows unconfigured origins outside production only', () => {
    expect(
      isOriginAllowed({
        origin: 'https://parent.example',
        allowedOrigins: [],
        nodeEnv: 'development',
      }),
    ).toBe(true);
    expect(
      isOriginAllowed({
        origin: 'https://parent.example',
        allowedOrigins: [],
        nodeEnv: 'production',
      }),
    ).toBe(false);
  });

  it('requires exact origin match when allowlist is configured', () => {
    expect(
      isOriginAllowed({
        origin: 'https://parent.example',
        allowedOrigins: ['https://parent.example'],
        nodeEnv: 'production',
      }),
    ).toBe(true);
    expect(
      isOriginAllowed({
        origin: 'https://evil.example',
        allowedOrigins: ['https://parent.example'],
        nodeEnv: 'production',
      }),
    ).toBe(false);
  });

  it('accepts valid postMessage payload and normalizes model', () => {
    expect(
      parseAutoTeacherMessage({
        type: AUTO_TEACHER_MESSAGE_TYPE,
        file_url: 'https://cdn.example.com/course.pdf',
        token: 'token-123',
        upload_url: 'https://parent.example.com/api/upload',
        model: 'qwen:deepseek-v4-flash',
      }),
    ).toEqual({
      fileUrl: 'https://cdn.example.com/course.pdf',
      token: 'token-123',
      uploadUrl: 'https://parent.example.com/api/upload',
      model: 'qwen:deepseek-v4-flash',
      modelId: 'deepseek-v4-flash',
      providerId: 'qwen',
      warning: undefined,
    });
  });

  it('rejects missing file_url and non-http urls', () => {
    expect(() => parseAutoTeacherMessage({ type: AUTO_TEACHER_MESSAGE_TYPE })).toThrow(
      'Missing required field: file_url',
    );
    expect(() =>
      parseAutoTeacherMessage({
        type: AUTO_TEACHER_MESSAGE_TYPE,
        file_url: 'file:///tmp/course.pdf',
        token: 'token-123',
        upload_url: 'https://parent.example.com/api/upload',
      }),
    ).toThrow('Only HTTP(S) file_url is allowed');
  });

  it('requires token and upload_url for parent upload handoff', () => {
    expect(() =>
      parseAutoTeacherMessage({
        type: AUTO_TEACHER_MESSAGE_TYPE,
        file_url: 'https://cdn.example.com/course.pdf',
        upload_url: 'https://parent.example.com/api/upload',
      }),
    ).toThrow('Missing required field: token');

    expect(() =>
      parseAutoTeacherMessage({
        type: AUTO_TEACHER_MESSAGE_TYPE,
        file_url: 'https://cdn.example.com/course.pdf',
        token: 'token-123',
      }),
    ).toThrow('Missing required field: upload_url');

    expect(() =>
      parseAutoTeacherMessage({
        type: AUTO_TEACHER_MESSAGE_TYPE,
        file_url: 'https://cdn.example.com/course.pdf',
        token: 'token-123',
        upload_url: 'file:///tmp/upload',
      }),
    ).toThrow('Only HTTP(S) upload_url is allowed');
  });

  it('falls back to default model for unsupported model', () => {
    expect(normalizeAutoTeacherModel('gpt-5.4')).toEqual({
      model: 'qwen:deepseek-v4-flash',
      modelId: 'deepseek-v4-flash',
      providerId: 'qwen',
      warning: 'Unsupported model "gpt-5.4", falling back to qwen:deepseek-v4-flash',
    });
  });

  it('builds a PDF-driven teacher lesson prompt', () => {
    const prompt = buildAutoTeacherRequirement('PDF text');
    expect(prompt).toContain('PDF 内容');
    expect(prompt).toContain('教师可直接使用的教案');
    expect(prompt).toContain('不要要求用户补充输入');
    expect(prompt).toContain('不要依赖图片生成、视频生成或 TTS 语音合成');
  });
});
