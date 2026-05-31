# 功能点 03：Provider 适配层

| 属性 | 值 |
|------|----|
| 状态 | 已验证 |
| 优先级 | P0 |
| 阶段 | 第零阶段：基础设施搭建 |
| 前置依赖 | 01-Feature Flag 功能开关系统 |
| 预估工时 | 3-5天 |

---

## 一、功能概述

设计并实现教师扩展模块与 OpenMAIC 原有生成能力之间的适配层（Adapter Layer）。教师扩展模块不直接调用原有的课程生成逻辑，而是通过适配层间接访问，从而实现解耦。

> 实施说明：本轮落地的是适配层合同、输入转换和教师 API 路由。教师 API 会将教师模式请求转换为现有 `GenerateClassroomInput`，并复用既有课堂生成任务队列 `/api/generate-classroom/[jobId]` 的轮询结果；不复制原有生成管线实现。

### 核心目标

1. 封装原有生成能力（教案、课件、Quiz、PBL）的调用接口
2. 为教师模式提供统一的服务调用 API
3. 将原有 API 的入参/出参转换为教师模式需要的格式
4. 保持与原有代码的松耦合

---

## 二、现有代码分析

### 现有生成管线（二阶段架构）

OpenMAIC 的内容生成采用**统一的二阶段管线**，所有类型的内容（Slide/Quiz/PBL/Interactive）都通过同一管线生成：

```
用户输入需求
    ↓
Stage 1: outline-generator.ts → 生成场景大纲 (SceneOutline)
    ↓
Stage 2: scene-generator.ts → 并行生成各场景内容 + Action
    ├── generateSlideContent()     → Slide 场景
    ├── generateQuizContent()      → Quiz 场景
    ├── generateWidgetContent()    → Interactive 场景
    └── generatePBLContent()       → PBL 场景
    ↓
PlaybackEngine → ActionEngine → 展示/互动
    ↓
导出: use-export-pptx.ts → PPTX 文件
```

### 现有关键文件（精确路径）

| 文件路径 | 说明 | 大小 |
|---------|------|------|
| `lib/generation/outline-generator.ts` | Stage 1: 大纲生成 | - |
| `lib/generation/scene-generator.ts` | Stage 2: 场景内容生成（核心） | 54KB |
| `lib/generation/pipeline-runner.ts` | 管线运行器 | - |
| `lib/generation/generation-pipeline.ts` | 管线入口和导出 | - |
| `lib/generation/scene-builder.ts` | 场景构建辅助 | - |
| `lib/generation/action-parser.ts` | Action 解析 | - |
| `lib/generation/prompt-formatters.ts` | Prompt 构建工具 | - |
| `lib/ai/llm.ts` | LLM 调用层 | - |
| `lib/ai/providers.ts` | Provider 注册表 | 43KB |
| `lib/server/provider-config.ts` | 服务端 Provider 配置 | 19KB |
| `lib/prompts/` | Prompt 模板系统（21 个模板目录 + 11 个片段） | - |
| `lib/types/generation.ts` | 生成相关类型定义 | - |
| `lib/types/slides.ts` | Slide 类型定义（PPTElement, Slide 等） | 17KB |
| `lib/store/settings.ts` | Settings Store（含功能开关） | 82KB |

### 关键 API 路由

| 路由 | 说明 |
|------|------|
| `app/api/generate/scene-content/route.ts` | 场景内容生成 API |
| `app/api/generate/scene-actions/route.ts` | 场景动作生成 API |
| `app/api/generate/scene-outlines-stream/route.ts` | 大纲流式生成 API |
| `app/api/generate-classroom/route.ts` | 服务器端完整课堂生成 |
| `app/api/quiz-grade/route.ts` | Quiz AI 评分 API |
| `app/api/pbl/chat/route.ts` | PBL 聊天 API |

### 关键函数

| 函数名 | 文件 | 说明 |
|--------|------|------|
| `generateSceneOutlinesFromRequirements()` | outline-generator.ts | 从需求生成大纲 |
| `generateFullScenes()` | scene-generator.ts | 并行生成所有场景 |
| `generateSceneContent()` | scene-generator.ts | 按类型生成内容 |
| `generateSlideContent()` | scene-generator.ts | Slide 内容生成 |
| `generateQuizContent()` | scene-generator.ts | Quiz 内容生成 |
| `generatePBLContent()` | generate-pbl.ts | PBL 内容生成 |
| `useExportPPTX()` | use-export-pptx.ts | PPTX 导出 Hook |
| `gradeChoiceQuestions()` | grading.ts | 本地选择题评分 |

### 前端生成入口

| 文件 | 说明 |
|------|------|
| `app/generation-preview/page.tsx` | 生成预览页（59KB） |
| `lib/hooks/use-scene-generator.ts` | 场景生成 React Hook（20KB） |
| `components/generation/outlines-editor.tsx` | 大纲编辑器（41KB） |

### 现有 AI 调用方式

项目使用 OpenAI-compatible 协议，通过 Provider 配置调用 Doubao 等模型：
- 服务端使用 `DOUBAO_API_KEY`、`DOUBAO_BASE_URL`、`DOUBAO_MODELS` 配置
- 默认模型：`doubao:ep-20260225155849-krdlt`
- 模型调用通过 `lib/ai/llm.ts` 统一封装
- 场景类型定义在大纲编辑器中：`SCENE_TYPES: ['slide', 'quiz', 'interactive', 'pbl']`

---

## 三、详细实现内容

### 3.1 适配层架构

```
lib/teacher/adapters/
  base-adapter.ts               — 适配器基类
  lesson-adapter.ts             — 教案生成适配器
  slide-adapter.ts              — 课件生成适配器
  quiz-adapter.ts               — Quiz 生成适配器
  pbl-adapter.ts                — PBL 生成适配器
  export-adapter.ts             — 导出适配器
  types.ts                      — 适配层类型定义
  index.ts                      — 统一导出
```

### 3.2 适配器基类

```typescript
abstract class BaseTeacherAdapter<TInput, TOutput> {
  protected featureFlags: FeatureFlags;

  constructor(flags: FeatureFlags) {
    this.featureFlags = flags;
  }

  abstract isEnabled(): boolean;
  abstract transform(input: TInput): OriginalInput;
  abstract parse(output: OriginalOutput): TOutput;
  abstract execute(input: TInput): Promise<TOutput>;
}
```

### 3.3 教案生成适配器

负责将教师模式的教案创建请求转换为 OpenMAIC 原有的生成 API 调用：

**输入转换**：
- 教师输入：学科、年级、课题、教学目标、课时 → 转换为原有 generate API 的入参

**输出转换**：
- 原有输出：完整课程结构 → 提取教案部分（教学目标、重点难点、教学流程等）

### 3.4 课件生成适配器

负责将教师模式的课件需求转换为 Slide 生成调用：

**输入转换**：
- 教师输入：基于已生成教案，指定课件风格、幻灯片数量等 → 转换为 Slide 生成入参

**输出转换**：
- 原有输出：Slide 数据结构 → 教师模式的课件展示格式

### 3.5 API 路由层

新增教师扩展模块专用的 API 路由：

```
app/api/teacher/
  generate-lesson/route.ts      — 教案生成
  generate-slides/route.ts      — 课件生成
  generate-quiz/route.ts        — Quiz 生成
  generate-pbl/route.ts         — PBL 生成
  export/route.ts               — 导出
```

每个 API 路由内部通过适配器调用原有能力，不直接复制原有逻辑。

当前实现中：
- `generate-lesson`、`generate-slides`、`generate-quiz`、`generate-pbl` 通过对应 Adapter 转换为 `GenerateClassroomInput`
- API 路由创建课堂生成 Job，并返回 `jobId`、`pollUrl`、`pollIntervalMs`
- `export` 路由先提供导出适配合同，实际文件导出在后续课件预览/导出功能中接入现有导出 Hook

---

## 四、需要新增的文件

| 文件路径 | 说明 |
|---------|------|
| `lib/teacher/adapters/base-adapter.ts` | 适配器基类 |
| `lib/teacher/adapters/lesson-adapter.ts` | 教案适配器 |
| `lib/teacher/adapters/slide-adapter.ts` | 课件适配器 |
| `lib/teacher/adapters/quiz-adapter.ts` | Quiz 适配器 |
| `lib/teacher/adapters/pbl-adapter.ts` | PBL 适配器 |
| `lib/teacher/adapters/export-adapter.ts` | 导出适配器 |
| `lib/teacher/adapters/types.ts` | 适配层类型 |
| `lib/teacher/adapters/index.ts` | 统一导出 |
| `app/api/teacher/generate-lesson/route.ts` | 教案生成 API |
| `app/api/teacher/generate-slides/route.ts` | 课件生成 API |
| `app/api/teacher/generate-quiz/route.ts` | Quiz 生成 API |
| `app/api/teacher/generate-pbl/route.ts` | PBL 生成 API |
| `app/api/teacher/export/route.ts` | 导出 API |

---

## 五、需要修改的文件

本功能点尽量不修改原有文件。适配层通过 import 引用原有模块的公开接口。

如原有模块接口不够开放，可能需要少量修改以暴露必要的函数/类型：

| 文件路径 | 修改内容 |
|---------|----------|
| `lib/generation/index.ts` | 可能需要导出更多内部函数供适配层使用 |
| `lib/prompts/` | 可能需要导出 prompt 模板供教师模式复用或定制 |

---

## 六、接口设计

### 教案生成 API

```
POST /api/teacher/generate-lesson
Body: {
  subject: string;         // 学科
  grade: string;           // 年级
  topic: string;           // 课题
  objectives?: string[];   // 教学目标
  duration?: number;       // 课时（分钟）
  style?: string;          // 教学风格偏好
}
Response: {
  jobId: string;
  status: string;
  pollUrl: string;
  pollIntervalMs: number;
  metadata: {
    subject: string;
    grade: string;
    topic: string;
  };
}
```

### 课件生成 API

```
POST /api/teacher/generate-slides
Body: {
  lessonId: string;        // 关联教案 ID
  slideCount?: number;     // 幻灯片数量
  style?: string;          // 课件风格
}
Response: {
  jobId: string;
  status: string;
  pollUrl: string;
  pollIntervalMs: number;
  metadata: {
    lessonId: string;
  };
}
```

---

## 七、验证方案

1. 适配器单元测试：验证输入/输出转换逻辑
2. API 集成测试：验证教师 API 可以正确调用原有生成能力
3. 端到端测试：验证从教师输入到生成结果的完整流程

---

## 八、风险与注意事项

1. **原有接口稳定性**：适配层依赖原有模块的接口，如果原有接口变化需要同步更新适配器
2. **类型兼容性**：确保适配层的类型定义与原有类型正确对应
3. **错误处理**：适配层需要正确捕获和转换原有模块的错误信息
4. **性能开销**：适配层增加了一层间接调用，需要注意性能影响
5. **API 安全**：教师 API 路由需要纳入现有认证中间件保护
