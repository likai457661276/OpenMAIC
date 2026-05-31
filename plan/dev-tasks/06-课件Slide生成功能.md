# 功能点 06：课件 Slide 生成功能

| 属性 | 值 |
|------|----|
| 状态 | 已实现 |
| 优先级 | P0 |
| 阶段 | 第一阶段：核心备课流程 |
| 前置依赖 | 02-教师扩展模块骨架、03-Provider适配层、05-教案生成功能 |
| 预估工时 | 5-7天 |

---

## 一、功能概述

基于已生成的教案内容，调用 OpenMAIC 原有的 Slide 生成能力，生成丰富的课件内容。课件内容包括文本、图片、公式、代码示例、交互元素等。

### 核心目标

1. 基于教案自动生成 Slide 课件内容
2. 保留 OpenMAIC 原有的丰富 Slide 类型（文本、图文、公式、示例等）
3. 支持自定义课件风格和幻灯片数量
4. 生成结果可在预览页面展示

---

## 二、现有代码分析

### 现有 Slide 生成能力

OpenMAIC 原有项目具备完善的 Slide 生成和展示能力：

| 文件/目录 | 说明 |
|-----------|------|
| `components/slide-renderer/` | Slide 渲染和展示组件 |
| `app/classroom/[id]/` | 课堂详情页，包含原 Stage/Slide 展示 |
| `lib/generation/` | 生成逻辑中包含 Slide 生成部分 |
| `packages/` | 可能包含 Slide 数据结构定义 |

### 现有 Slide 类型

原有 Slide 可能支持以下类型：
- 标题页 (Title Slide)
- 内容页 (Content Slide)
- 图文混排 (Image + Text)
- 列表/要点 (Bullet Points)
- 代码/公式 (Code/Formula)
- 对比/表格 (Comparison/Table)
- 互动页 (Interactive)
- 总结页 (Summary)

---

## 三、详细实现内容

### 3.1 课件数据模型

**新增文件**：`lib/teacher/types/slide.ts`

```typescript
export interface SlideGenerationInput {
  lessonId: string;           // 关联教案 ID
  lessonPlan?: LessonPlan;    // API 会通过 lessonId 读取教案
  slideCount?: number;        // 期望幻灯片数量
  style?: SlideStyle;         // 课件风格
  includeTypes?: SlideType[]; // 指定包含的 Slide 类型
}

export type SlideStyle = 'professional' | 'casual' | 'academic' | 'colorful';

export type SlideType =
  | 'title'
  | 'content'
  | 'image-text'
  | 'bullets'
  | 'code'
  | 'formula'
  | 'comparison'
  | 'table'
  | 'interactive'
  | 'summary';

export interface TeacherSlide {
  id: string;
  order: number;
  type: SlideType;
  title: string;
  content: Slide;             // 兼容 OpenMAIC 原 Slide 渲染器
  notes?: string;             // 教师备注/演讲稿
  duration?: number;          // 建议展示时长
}

export interface TeacherSlideSet {
  id: string;
  lessonId: string;
  slides: TeacherSlide[];
  totalDuration: number;
  createdAt: string;          // ISO 时间
  updatedAt: string;          // ISO 时间
  sourceJobId?: string;       // 对应原 classroom generation job
  sourceClassroomId?: string;
}
```

### 3.2 课件生成服务

**实现文件**：`lib/teacher/slide-service.ts`

核心功能：
1. 接收课件生成请求（包含教案信息）
2. 读取本地结构化教案并生成兼容原 Slide 类型的课件数据
3. 通过 SlideAdapter 创建原 classroom generation job
4. 为每张 Slide 添加教师备注字段
5. 保存课件数据到 `/data/teacher/slides`

### 3.3 课件生成触发入口

在教案详情页增加「生成课件」按钮：
- 基于当前教案内容生成课件
- 支持配置课件参数（数量、风格等）
- 生成完成后跳转到课件预览页

### 3.4 课件生成配置弹窗

**新增文件**：`components/teacher/slide-config-dialog.tsx`

配置弹窗，包含：
- 幻灯片数量滑块
- 课件风格选择
- 包含内容类型勾选
- 生成完成后跳转课件预览页

---

## 四、需要新增的文件

| 文件路径 | 说明 |
|---------|------|
| `lib/teacher/types/slide.ts` | 课件数据类型定义 |
| `lib/teacher/slide-service.ts` | 课件生成服务 |
| `components/teacher/slide-config-dialog.tsx` | 课件生成配置弹窗 |
| `app/api/teacher/generate-slides/route.ts` | 课件生成 API（完善实现） |
| `app/api/teacher/lessons/[id]/slides/route.ts` | 课件读取与保存 API |

---

## 五、需要修改的文件

| 文件路径 | 修改内容 |
|---------|----------|
| `app/(teacher)/teacher/lesson/[id]/page.tsx` | 添加「生成课件」按钮和配置入口 |
| `lib/teacher/adapters/slide-adapter.ts` | 完善课件生成适配器 |

---

## 六、接口设计

### 生成课件

```
POST /api/teacher/generate-slides
Body: SlideGenerationInput
Response: { slideSetId: string; slides: TeacherSlide[]; }
```

实际响应额外包含 `slideSet`、`jobId`、`pollUrl` 和 `pollIntervalMs`，用于衔接原课堂生成任务。

### 获取课件

```
GET /api/teacher/lessons/:lessonId/slides
Response: { slideSet: TeacherSlideSet; }
```

### 保存课件

```
PUT /api/teacher/lessons/:lessonId/slides
Body: { slides: TeacherSlide[]; style?: SlideStyle; }
Response: { slideSet: TeacherSlideSet; }
```

---

## 七、验证方案

1. 基于教案可正常触发课件生成
2. 生成的课件包含丰富内容类型
3. 课件数量可按配置控制
4. 生成的课件数据可正确保存和读取
5. 服务层测试覆盖课件生成、重排保存与读取

---

## 八、风险与注意事项

1. **Slide 类型兼容**：需要确保教师模式的 Slide 类型与原有渲染组件兼容
2. **生成耗时**：原 classroom generation job 异步执行；教师课件先基于结构化教案生成可编辑初稿
3. **内容质量**：当前课件结构由教案字段展开，后续可在 job 成功后将更丰富的 AI 结果回填
4. **教师备注**：生成后应自动填充建议的教师备注/演讲稿
