import { describe, expect, it } from 'vitest';
import {
  AUTO_TEACHER_MESSAGE_TYPE,
  buildAutoTeacherRequirement,
  getAutoTeacherAllowedPdfOrigins,
  inferAutoTeacherPdfTitle,
  isAutoTeacherGenerateMessage,
  isOriginAllowed,
  normalizeAutoTeacherModel,
  parseAllowedOrigins,
  parseAutoImportTeacherMessage,
  parseAutoTeacherMessage,
  shouldHideEmbeddedClassroomBackButton,
} from '@/lib/auto-teacher/protocol';

describe('auto-teacher protocol', () => {
  it('hides classroom back navigation for embedded auto flows only', () => {
    expect(shouldHideEmbeddedClassroomBackButton({ autoTeacher: '1' })).toBe(true);
    expect(shouldHideEmbeddedClassroomBackButton({ autoImport: '1' })).toBe(true);
    expect(shouldHideEmbeddedClassroomBackButton({})).toBe(false);
    expect(shouldHideEmbeddedClassroomBackButton({ autoTeacher: '0' })).toBe(false);
  });

  it('parses allowed origins from comma-separated env value', () => {
    expect(parseAllowedOrigins('https://a.example, https://b.example ,,')).toEqual(
      expect.arrayContaining(['https://a.example', 'https://b.example']),
    );
  });

  it('includes the production teaching origin only in production', () => {
    expect(
      getAutoTeacherAllowedPdfOrigins({
        env: { NODE_ENV: 'production' },
      }),
    ).toEqual(expect.arrayContaining(['https://bingo-teaching.app.bin-go.cc']));
    expect(
      getAutoTeacherAllowedPdfOrigins({
        env: { NODE_ENV: 'development' },
      }),
    ).not.toContain('https://bingo-teaching.app.bin-go.cc');
  });

  it('adds the Guizhou teaching test origin in test environment', () => {
    expect(
      getAutoTeacherAllowedPdfOrigins({
        env: { APP_ENV: 'test' },
      }),
    ).toContain('http://guizhou.teaching.test.bin-go.me');
  });

  it('adds local development PDF origins during local development', () => {
    expect(
      getAutoTeacherAllowedPdfOrigins({
        env: { NODE_ENV: 'development' },
      }),
    ).toEqual(
      expect.arrayContaining([
        'http://guizhou.teaching.test.bin-go.me',
        'http://professional-development.local.bin-go.me',
      ]),
    );
  });

  it('supports explicit PDF origins that differ from the parent project origin', () => {
    expect(
      getAutoTeacherAllowedPdfOrigins({
        configuredPdfOrigins: 'http://pdf.example.com',
        configuredParentOrigins: 'http://parent.example.com',
        env: { NODE_ENV: 'production' },
      }),
    ).toEqual(expect.arrayContaining(['http://pdf.example.com', 'http://parent.example.com']));
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

  it('identifies auto teacher generate messages before parsing', () => {
    expect(isAutoTeacherGenerateMessage({ type: AUTO_TEACHER_MESSAGE_TYPE })).toBe(true);
    expect(isAutoTeacherGenerateMessage({ type: 'AUTO_TEACHER_READY' })).toBe(false);
    expect(isAutoTeacherGenerateMessage({})).toBe(false);
    expect(isAutoTeacherGenerateMessage('AUTO_TEACHER_GENERATE')).toBe(false);
  });

  it('accepts valid postMessage payload and normalizes model', () => {
    expect(
      parseAutoTeacherMessage({
        type: AUTO_TEACHER_MESSAGE_TYPE,
        file_url: 'https://cdn.example.com/course.pdf',
        pdf_text: '# 第一课时\n教学目标',
        token: 'token-123',
        upload_url: 'https://parent.example.com/api/upload',
        model: 'qwen:deepseek-v4-flash',
      }),
    ).toEqual({
      fileUrl: 'https://cdn.example.com/course.pdf',
      pdfText: '# 第一课时\n教学目标',
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
        pdf_text: '教案文本',
        courseware_name: '  生活中的周期现象  ',
        token: 'token-123',
        upload_url: 'https://parent.example.com/api/upload',
      }),
    ).toMatchObject({
      coursewareName: '生活中的周期现象',
    });
  });

  it('accepts and trims an optional prompt from the parent postMessage payload', () => {
    expect(
      parseAutoTeacherMessage({
        type: AUTO_TEACHER_MESSAGE_TYPE,
        file_url: 'https://cdn.example.com/course.pdf',
        pdf_text: '教案文本',
        token: 'token-123',
        uploadUrl: 'https://parent.example.com/api/upload',
        prompt: '  请设计一节探究式课堂。  ',
      }),
    ).toMatchObject({
      uploadUrl: 'https://parent.example.com/api/upload',
      prompt: '请设计一节探究式课堂。',
    });
  });

  it('requires parsed lesson text from the parent postMessage payload', () => {
    expect(
      parseAutoTeacherMessage({
        type: AUTO_TEACHER_MESSAGE_TYPE,
        pdf_text: '  # 第一课时\n教学目标  ',
        token: 'token-123',
        upload_url: 'https://parent.example.com/api/upload',
      }),
    ).toMatchObject({
      pdfText: '# 第一课时\n教学目标',
    });

    expect(() =>
      parseAutoTeacherMessage({
        type: AUTO_TEACHER_MESSAGE_TYPE,
        token: 'token-123',
        upload_url: 'https://parent.example.com/api/upload',
      }),
    ).toThrow('Missing required field: pdf_text');
  });

  it('accepts camelCase parsed PDF text alias from the parent postMessage payload', () => {
    expect(
      parseAutoTeacherMessage({
        type: AUTO_TEACHER_MESSAGE_TYPE,
        pdfText: '  教案文本  ',
        token: 'token-123',
        upload_url: 'https://parent.example.com/api/upload',
      }),
    ).toMatchObject({
      pdfText: '教案文本',
    });
  });

  it('accepts auto-import ZIP URL aliases and teachType', () => {
    expect(
      parseAutoImportTeacherMessage({
        type: AUTO_TEACHER_MESSAGE_TYPE,
        zip_url: 'https://cdn.example.com/course.maic.zip',
        teachType: 'teacher',
        fileName: '  贵州课堂.zip  ',
        token: ' token-123 ',
        upload_url: 'https://parent.example.com/api/upload',
      }),
    ).toEqual({
      zipUrl: 'https://cdn.example.com/course.maic.zip',
      teachType: 'teacher',
      fileName: '贵州课堂.zip',
      token: 'token-123',
      uploadUrl: 'https://parent.example.com/api/upload',
    });

    expect(
      parseAutoImportTeacherMessage({
        type: AUTO_TEACHER_MESSAGE_TYPE,
        zipUrl: 'https://cdn.example.com/classroom.zip',
        teachType: 'classroom',
        token: 'token-123',
        uploadUrl: 'https://parent.example.com/api/upload',
      }),
    ).toEqual({
      zipUrl: 'https://cdn.example.com/classroom.zip',
      teachType: 'classroom',
      token: 'token-123',
      uploadUrl: 'https://parent.example.com/api/upload',
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

    expect(() =>
      parseAutoImportTeacherMessage({
        type: AUTO_TEACHER_MESSAGE_TYPE,
        zip_url: 'https://cdn.example.com/course.zip',
        teachType: 'teacher',
        upload_url: 'https://parent.example.com/api/upload',
      }),
    ).toThrow('Missing required field: token');

    expect(() =>
      parseAutoImportTeacherMessage({
        type: AUTO_TEACHER_MESSAGE_TYPE,
        zip_url: 'https://cdn.example.com/course.zip',
        teachType: 'teacher',
        token: 'token-123',
      }),
    ).toThrow('Missing required field: upload_url');

    expect(() =>
      parseAutoImportTeacherMessage({
        type: AUTO_TEACHER_MESSAGE_TYPE,
        zip_url: 'https://cdn.example.com/course.zip',
        teachType: 'teacher',
        token: 'token-123',
        upload_url: 'file:///tmp/upload',
      }),
    ).toThrow('Only HTTP(S) upload_url is allowed');
  });

  it('allows omitted file_url but rejects non-http file_url when provided', () => {
    expect(() =>
      parseAutoTeacherMessage({
        type: AUTO_TEACHER_MESSAGE_TYPE,
        file_url: 'file:///tmp/course.pdf',
        pdf_text: '教案文本',
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
        pdf_text: '教案文本',
        upload_url: 'https://parent.example.com/api/upload',
      }),
    ).toThrow('Missing required field: token');

    expect(() =>
      parseAutoTeacherMessage({
        type: AUTO_TEACHER_MESSAGE_TYPE,
        file_url: 'https://cdn.example.com/course.pdf',
        pdf_text: '教案文本',
        token: 'token-123',
      }),
    ).toThrow('Missing required field: upload_url');

    expect(() =>
      parseAutoTeacherMessage({
        type: AUTO_TEACHER_MESSAGE_TYPE,
        file_url: 'https://cdn.example.com/course.pdf',
        pdf_text: '教案文本',
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

  it('builds a parent-text-driven teacher lesson prompt', () => {
    const prompt = buildAutoTeacherRequirement('教案文本');
    expect(prompt).toContain('教案文本');
    expect(prompt).toContain('教师可直接使用的教案');
    expect(prompt).toContain('不要要求用户补充输入');
    expect(prompt).toContain('不要依赖图片生成、视频生成或 TTS 语音合成');
  });

  it('uses a custom prompt while keeping the parsed PDF context note', () => {
    const prompt = buildAutoTeacherRequirement('教案文本', '请突出易错点和分层练习。');
    expect(prompt).toContain('请突出易错点和分层练习。');
    expect(prompt).toContain('当前可用文本长度约 4 字符');
    expect(prompt).not.toContain('不要要求用户补充输入');
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
