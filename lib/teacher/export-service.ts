import pptxgen from 'pptxgenjs';
import { getTeacherLesson } from '@/lib/teacher/lesson-service';
import { createSlideSetFromLesson, getLessonSlideSet } from '@/lib/teacher/slide-service';
import type { LessonPlan, TeacherSlide, TeacherSlideSet } from '@/lib/teacher/types';
import type { PPTElement, PPTTextElement, Slide } from '@/lib/types/slides';
import { type AST, toAST } from '@/lib/export/html-parser';

export type TeacherExportFormat = 'pptx' | 'pdf';

export interface TeacherExportOption {
  format: TeacherExportFormat;
  label: string;
  enabled: boolean;
}

export interface TeacherExportRequest {
  lessonId: string;
  format: TeacherExportFormat;
  slideIds?: string[];
  fileName?: string;
}

export interface TeacherExportFile {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  slideCount: number;
  selectedSlideIds: string[];
}

const PPTX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

const DEFAULT_VIEWPORT_RATIO = 0.5625;
const DEFAULT_FONT = 'Microsoft YaHei';

export function getTeacherExportOptions(): TeacherExportOption[] {
  return [
    { format: 'pptx', label: 'PPTX', enabled: true },
    { format: 'pdf', label: 'PDF', enabled: false },
  ];
}

function sanitizeFileName(input: string | undefined, fallback: string): string {
  const source = (input || fallback).trim() || fallback;
  return source
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, ' ')
    .slice(0, 90);
}

function toPptxFileName(input: string | undefined, lesson: LessonPlan): string {
  const base = sanitizeFileName(input, lesson.title || 'teacher-slides');
  return base.toLowerCase().endsWith('.pptx') ? base : `${base}.pptx`;
}

function decodeHtmlEntity(text: string): string {
  return text
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#039;', "'");
}

function astToText(nodes: AST[]): string {
  const parts: string[] = [];
  for (const node of nodes) {
    if ('content' in node) {
      parts.push(node.content);
      continue;
    }

    if ('children' in node) {
      const childText = astToText(node.children);
      if (childText) parts.push(childText);
      if (['p', 'div', 'li', 'br'].includes(node.tagName)) parts.push('\n');
    }
  }
  return parts.join('');
}

function htmlToPlainText(html: string): string {
  return decodeHtmlEntity(
    astToText(toAST(html))
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  );
}

function pxToInch(value: number, viewportSize: number): number {
  return value / (96 * (viewportSize / 960));
}

function pxToPt(value: number, viewportSize: number): number {
  return value / ((96 / 72) * (viewportSize / 960));
}

function normalizeColor(color: string | undefined, fallback = '000000'): string {
  if (!color) return fallback;
  const trimmed = color.trim();
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    return trimmed
      .slice(1)
      .split('')
      .map((char) => char + char)
      .join('');
  }
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed.slice(1);
  if (/^[0-9a-f]{6}$/i.test(trimmed)) return trimmed;
  return fallback;
}

function getFontSize(element: PPTTextElement, viewportSize: number): number {
  const match = element.content.match(/font-size\s*:\s*(\d+(?:\.\d+)?)px/i);
  const fontSizePx = match ? Number(match[1]) : 24;
  return Math.max(8, Math.round(pxToPt(fontSizePx, viewportSize)));
}

function addBackground(pptxSlide: pptxgen.Slide, slide: Slide) {
  const background = slide.background;
  if (!background) return;
  if (background.type === 'solid' && background.color) {
    pptxSlide.background = { color: normalizeColor(background.color, 'FFFFFF') };
  }
}

function addTextElement(pptxSlide: pptxgen.Slide, element: PPTTextElement, viewportSize: number) {
  const text = htmlToPlainText(element.content);
  if (!text) return;

  const options: pptxgen.TextPropsOptions = {
    x: pxToInch(element.left, viewportSize),
    y: pxToInch(element.top, viewportSize),
    w: pxToInch(element.width, viewportSize),
    h: pxToInch(element.height, viewportSize),
    fontFace: element.defaultFontName || DEFAULT_FONT,
    fontSize: getFontSize(element, viewportSize),
    color: normalizeColor(element.defaultColor),
    valign: 'top',
    margin: pxToPt(8, viewportSize),
    fit: 'shrink',
  };

  if (element.rotate) options.rotate = element.rotate;
  if (element.fill) options.fill = { color: normalizeColor(element.fill, 'FFFFFF') };
  if (element.outline?.width && element.outline.color) {
    options.line = {
      color: normalizeColor(element.outline.color),
      width: pxToPt(element.outline.width, viewportSize),
    };
  }
  if (element.opacity !== undefined) options.transparency = (1 - element.opacity) * 100;

  pptxSlide.addText(text, options);
}

function addFallbackElement(pptxSlide: pptxgen.Slide, element: PPTElement, viewportSize: number) {
  if (element.type !== 'shape') return;
  pptxSlide.addShape(pptxgen.ShapeType.rect, {
    x: pxToInch(element.left, viewportSize),
    y: pxToInch(element.top, viewportSize),
    w: pxToInch(element.width, viewportSize),
    h: pxToInch(element.height, viewportSize),
    fill: { color: normalizeColor(element.fill, 'FFFFFF') },
    line: element.outline?.color
      ? { color: normalizeColor(element.outline.color), width: element.outline.width || 1 }
      : { color: normalizeColor(element.fill, 'FFFFFF'), transparency: 100 },
  });
}

async function buildTeacherPptxBuffer(slides: TeacherSlide[]): Promise<Buffer> {
  const firstCanvas = slides[0]?.content;
  const viewportRatio = firstCanvas?.viewportRatio ?? DEFAULT_VIEWPORT_RATIO;

  const pptx = new pptxgen();
  pptx.author = 'OpenMAIC Teacher';
  pptx.company = 'OpenMAIC';
  if (viewportRatio === 0.625) pptx.layout = 'LAYOUT_16x10';
  else if (viewportRatio === 0.75) pptx.layout = 'LAYOUT_4x3';
  else pptx.layout = 'LAYOUT_16x9';

  for (const teacherSlide of slides) {
    const canvas = teacherSlide.content;
    const pptxSlide = pptx.addSlide();
    addBackground(pptxSlide, canvas);
    if (teacherSlide.notes) pptxSlide.addNotes(teacherSlide.notes);

    for (const element of canvas.elements) {
      if (element.type === 'text') addTextElement(pptxSlide, element, canvas.viewportSize);
      else addFallbackElement(pptxSlide, element, canvas.viewportSize);
    }
  }

  return (await pptx.write({ outputType: 'nodebuffer', compression: true })) as Buffer;
}

function selectSlides(slideSet: TeacherSlideSet, slideIds: string[] | undefined): TeacherSlide[] {
  const orderedSlides = slideSet.slides.slice().sort((a, b) => a.order - b.order);
  if (!slideIds?.length) return orderedSlides;

  const selected = new Set(slideIds);
  return orderedSlides.filter((slide) => selected.has(slide.id));
}

export async function exportTeacherSlides(input: TeacherExportRequest): Promise<TeacherExportFile> {
  if (input.format !== 'pptx') {
    throw new Error('当前仅支持 PPTX 导出');
  }

  const lesson = await getTeacherLesson(input.lessonId);
  if (!lesson) {
    throw new Error('教案不存在');
  }

  const slideSet =
    (await getLessonSlideSet(input.lessonId)) ?? (await createSlideSetFromLesson(lesson));
  const slides = selectSlides(slideSet, input.slideIds);
  if (!slides.length) {
    throw new Error('没有可导出的课件页');
  }

  const buffer = await buildTeacherPptxBuffer(slides);
  return {
    fileName: toPptxFileName(input.fileName, lesson),
    mimeType: PPTX_MIME_TYPE,
    buffer,
    slideCount: slides.length,
    selectedSlideIds: slides.map((slide) => slide.id),
  };
}
