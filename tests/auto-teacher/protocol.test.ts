import { describe, expect, it } from 'vitest';
import {
  AUTO_TEACHER_MESSAGE_TYPE,
  buildAutoTeacherRequirement,
  getAutoTeacherAllowedPdfOrigins,
  inferAutoTeacherPdfTitle,
  isOriginAllowed,
  normalizeAutoTeacherModel,
  parseAllowedOrigins,
  parseAutoImportTeacherMessage,
  parseAutoTeacherMessage,
} from '@/lib/auto-teacher/protocol';

describe('auto-teacher protocol', () => {
  it('parses allowed origins from comma-separated env value', () => {
    expect(parseAllowedOrigins('https://a.example, https://b.example ,,')).toEqual([
      'https://a.example',
      'https://b.example',
    ]);
  });

  it('adds the Guizhou teaching test origin in test environment', () => {
    expect(
      getAutoTeacherAllowedPdfOrigins({
        env: { APP_ENV: 'test' },
      }),
    ).toContain('http://guizhou.teaching.test.bin-go.me');
  });

  it('adds the Guizhou teaching test PDF origin during local development', () => {
    expect(
      getAutoTeacherAllowedPdfOrigins({
        env: { NODE_ENV: 'development' },
      }),
    ).toContain('http://guizhou.teaching.test.bin-go.me');
  });

  it('supports explicit PDF origins that differ from the parent project origin', () => {
    expect(
      getAutoTeacherAllowedPdfOrigins({
        configuredPdfOrigins: 'http://pdf.example.com',
        configuredParentOrigins: 'http://parent.example.com',
        env: { NODE_ENV: 'production' },
      }),
    ).toEqual(['http://pdf.example.com', 'http://parent.example.com']);
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

  it('accepts courseware_name from the parent postMessage payload', () => {
    expect(
      parseAutoTeacherMessage({
        type: AUTO_TEACHER_MESSAGE_TYPE,
        file_url: 'https://cdn.example.com/course.pdf',
        courseware_name: '  生活中的周期现象  ',
        token: 'token-123',
        upload_url: 'https://parent.example.com/api/upload',
      }),
    ).toMatchObject({
      coursewareName: '生活中的周期现象',
    });
  });

  it('accepts auto-import ZIP URL aliases and teachType', () => {
    expect(
      parseAutoImportTeacherMessage({
        type: AUTO_TEACHER_MESSAGE_TYPE,
        zip_url: 'https://cdn.example.com/course.maic.zip',
        teachType: 'teacher',
        fileName: '  贵州课堂.zip  ',
      }),
    ).toEqual({
      zipUrl: 'https://cdn.example.com/course.maic.zip',
      teachType: 'teacher',
      fileName: '贵州课堂.zip',
    });

    expect(
      parseAutoImportTeacherMessage({
        type: AUTO_TEACHER_MESSAGE_TYPE,
        zipUrl: 'https://cdn.example.com/classroom.zip',
        teachType: 'classroom',
      }),
    ).toEqual({
      zipUrl: 'https://cdn.example.com/classroom.zip',
      teachType: 'classroom',
    });

    expect(
      parseAutoImportTeacherMessage({
        type: AUTO_TEACHER_MESSAGE_TYPE,
        zipurl: 'https://cdn.example.com/legacy.zip',
        teachType: 'teacher',
      }),
    ).toEqual({
      zipUrl: 'https://cdn.example.com/legacy.zip',
      teachType: 'teacher',
    });
  });

  it('rejects invalid auto-import payloads', () => {
    expect(() =>
      parseAutoImportTeacherMessage({
        type: AUTO_TEACHER_MESSAGE_TYPE,
        teachType: 'teacher',
      }),
    ).toThrow('Missing required field: zip_url');

    expect(() =>
      parseAutoImportTeacherMessage({
        type: AUTO_TEACHER_MESSAGE_TYPE,
        zip_url: 'file:///tmp/course.zip',
        teachType: 'teacher',
      }),
    ).toThrow('Only HTTP(S) zip_url is allowed');

    expect(() =>
      parseAutoImportTeacherMessage({
        type: AUTO_TEACHER_MESSAGE_TYPE,
        zip_url: 'https://cdn.example.com/course.zip',
        teachType: 'unknown',
      }),
    ).toThrow('Invalid teachType');
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

  it('infers a display title from PDF content headings', () => {
    expect(
      inferAutoTeacherPdfTitle(`
        # 章节引入：周期现象与三角函数

        - 观看周期现象视频：车轮、钟摆、潮汐
      `),
    ).toBe('章节引入：周期现象与三角函数');
  });

  it('prefers labeled PDF titles and keeps numeric title prefixes', () => {
    expect(
      inferAutoTeacherPdfTitle(`
        目录
        课题：3D 建模中的空间坐标
        第一节 坐标系
      `),
    ).toBe('3D 建模中的空间坐标');
  });

  it('falls back when PDF text has no usable title', () => {
    expect(inferAutoTeacherPdfTitle('PDF\n目录\n第 1 页')).toBe('PDF 课件');
  });
});
