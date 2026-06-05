# main 分支代码合并文档

本文档用于将 `main` 分支代码合并到当前教师扩展分支时使用。当前分支以教师扩展、豆包默认模型配置、教师课件模型和教师课件转互动课堂为核心差异；合并时应优先保证这些能力不被上游代码覆盖。

## 合并目标

- 以当前分支的模型配置为准，尤其是服务端默认模型、豆包 Provider、服务端托管 Provider 解析规则和思考配置。
- 保留新增教师课件模型，确保教案、课件、PPTX 导出和教师课堂预览仍使用同一套 `TeacherSlideSet` 数据结构。
- 保留教师课件转换互动课堂功能，确保课件预览页能把现有场景、讲稿和转换标记带入 `/generation-preview`。
- 控制改动范围，教师业务继续隔离在教师扩展目录和适配层内。

## 合并前检查

1. 确认工作区状态，避免覆盖未提交修改：

   ```bash
   git status --short
   ```

2. 确认运行环境为 macOS/zsh，Node.js 和 pnpm 版本满足项目要求：

   ```bash
   uname -s
   node -v
   pnpm -v
   ```

3. 更新目标分支后再合并：

   ```bash
   git fetch origin main
   git merge origin/main
   ```

如果实际合并来源不是 `origin/main`，先替换为对应远程引用；不要把 `.env.local`、`server-providers.yml` 或真实密钥纳入冲突示例和提交。

## 模型配置保留规则

合并冲突中，模型配置以当前分支为准。重点文件和规则如下：

| 文件 | 必须保留的当前分支行为 |
|------|------------------------|
| `lib/server/provider-config.ts` | `FALLBACK_DEFAULT_MODEL` 为 `doubao:ep-20260225155849-krdlt`；支持 `server-providers.yml` 与环境变量双来源；服务端托管 Provider 的 key/baseUrl 由服务端配置决定；`DEFAULT_MODEL` 对应 Provider 的公开模型列表应优先展示默认模型。 |
| `lib/server/resolve-model.ts` | 请求未传有效模型时回退到 `DEFAULT_MODEL` 或 `doubao:ep-20260225155849-krdlt`；服务端托管 Provider 不接受客户端 baseUrl 覆盖；生产环境只校验客户端传入的 unmanaged baseUrl。 |
| `lib/ai/providers.ts` | 保留 `doubao` Provider、默认 Ark Base URL、Seed 2.0/1.8 模型列表，以及 OpenAI-compatible 创建逻辑。 |
| `lib/ai/model-metadata.ts`、`lib/ai/llm.ts` | 保留豆包 thinking/reasoning 参数映射，避免合并后思考配置 UI 有值但请求体不生效。 |
| `.env.example`、`DEPLOYMENT-zh.md`、`README-zh.md` | 保留 `DOUBAO_API_KEY`、`DOUBAO_BASE_URL`、`DOUBAO_MODELS`、`DEFAULT_MODEL` 等说明；示例中不得出现真实密钥。 |

冲突处理原则：

- 如果 `main` 新增模型或 Provider，可合并进来；但默认模型和豆包相关 fallback 不应被替换。
- 如果 `main` 调整 `server-providers.yml` 暴露字段，仍不得向客户端返回 API key 或 baseUrl。
- 如果 `main` 修改设置同步逻辑，需确认 `serverModels` 元数据仍用于过滤服务端托管模型，且当前选中模型不在服务端列表中时会安全回退。

## 教师课件模型兼容

新增教师课件模型位于 `lib/teacher/types/slide.ts`，合并时应保留以下字段和语义：

- `TeacherSlideType` 包含 `title`、`content`、`image-text`、`bullets`、`code`、`formula`、`comparison`、`table`、`interactive`、`summary`。
- `TeacherSlide` 使用 `content: Slide` 承载可编辑画布，保留 `notes` 和 `duration` 作为教师讲稿与课堂节奏信息。
- `TeacherSlideSet` 绑定 `lessonId`，保留 `slides`、`totalDuration`、`style`、`sourceJobId`、`sourceClassroomId`，用于从生成任务或课堂结果追踪来源。
- `UpdateSlideSetInput` 允许更新 `slides`、`style`、`sourceJobId`、`sourceClassroomId`，但 `lessonId` 和 `createdAt` 应由服务端保存逻辑保持稳定。

相关实现边界：

- `lib/teacher/slide-service.ts` 负责从教案生成、读取、保存和更新课件。
- `lib/teacher/export-service.ts` 负责教师课件 PPTX 导出。
- `app/classroom/teacher/[id]/page.tsx` 与 `components/teacher/teacher-classroom-stage.tsx` 负责教师课件预览与续生成。

合并时如果 `main` 修改了 `Slide`、`Scene`、课堂存储或 PPTX 导出类型，应优先在教师适配层或教师服务中补兼容，不要把教师业务逻辑扩散到普通课堂页面。

## 互动课件转互动课堂兼容

当前分支在教师课件预览页提供“转互动课堂”能力。合并时必须保留：

- `components/teacher/teacher-classroom-stage.tsx` 中的 `buildInteractiveConversionRequirement`，它会根据当前课件页面、讲稿和讨论动作生成面向学生的互动课堂需求。
- 转换入口会写入 `sessionStorage.generationSession`，其中必须包含：
  - `requirements.interactiveMode: true`
  - `teacherMode: true`
  - `teacherInteractiveConversion: true`
  - `teacherInteractiveSource.stage`
  - `teacherInteractiveSource.scenes`
  - `originalRequirement`
- 转换前会设置 `agentMode` 为 `auto`，并启用 TTS；合并设置逻辑时不要移除这两个转换前置条件。
- `/generation-preview` 必须识别 `teacherInteractiveConversion`，并走教师互动转换所需步骤；现有测试期望只走 `agent-generation` 和 `actions`。

冲突热点：

- `app/generation-preview/page.tsx`
- `app/generation-preview/types.ts`
- `components/teacher/teacher-classroom-stage.tsx`
- `lib/hooks/use-scene-generator.ts`
- `lib/server/classroom-generation.ts`
- `lib/server/classroom-media-generation.ts`

如果 `main` 改动普通互动课堂生成流程，合并后需要手动确认教师课件转换仍不会重新走 PDF 解析、课件大纲重建或普通需求准备流程。

## 教师扩展功能边界

合并时继续遵守教师扩展隔离边界：

- 教师页面和 API：`app/(teacher)/teacher/`、`app/api/teacher/`
- 学生参与入口：`app/join/`
- 教师 UI：`components/teacher/`
- 教师服务、类型、适配层：`lib/teacher/`
- 教师功能开关：`configs/feature-flags.ts`、`lib/feature-flags.ts`

允许少量触达原项目核心组件，但必须保持教师模式判断：

- `components/stage/*`
- `components/canvas/*`
- `components/edit/PlaybackChromeRoot.tsx`
- `lib/playback/*`
- `lib/hooks/use-scene-generator.ts`

普通 `/classroom/...` 页面应继续保留 OpenMAIC 原有播放、白板、语音、跟随演示等能力；教师预览 `/classroom/teacher/[id]` 才应用教师模式下的弱化播放控制。

## 其他注意事项

- 功能开关默认值以教师扩展模式为准：`teacherExtension`、`lessonGeneration`、`richCourseware`、`quizGeneration`、`pblGeneration`、`realtimeAnswer`、`onlineScoring`、`classroomFeedback`、`pptxExport` 默认开启；`whiteboard`、`voiceNarration`、`voicePlayback`、`followPresenter`、`complexRealtimePlayback` 默认关闭。
- Docker 本地开发优先使用 `docker compose -f docker-compose.dev.yml up --build`；不要在合并中移除 dev compose 配置。
- 当前分支使用 `pnpm`，不要引入 npm/yarn lockfile。
- 合并媒体 Provider 时保留当前分支新增的豆包图片/视频默认模型、SiliconFlow 图片适配和服务端媒体 Provider 解析逻辑。
- 合并 i18n 文案时至少检查 `zh-CN`；如果新增 key 影响多语言文件，应同步其它 locale，避免运行时缺 key。
- 合并路由和路径配置时保留 `lib/app-paths.ts`，避免部署在 basePath 或反向代理路径下的 API 调用失效。
- 安全相关冲突中，保留 SSRF 校验、服务端托管 Provider 不暴露密钥、不提交 `.env.local` 和 `server-providers.yml` 的规则。

## 推荐验证

合并并解决冲突后，先运行只读兼容检查：

```bash
scripts/check-upstream-compat.sh
```

再运行核心测试：

```bash
pnpm exec tsc --noEmit
pnpm exec vitest run tests/server/provider-config.test.ts tests/store/settings-server-sync.test.ts tests/generation-preview/types.test.ts
pnpm exec vitest run tests/feature-flags.test.ts tests/feature-gate.test.ts tests/teacher/adapters.test.ts tests/teacher/services.test.ts
pnpm build
```

如果本次合并涉及课堂生成、课件转换、播放或媒体生成，再补充手工验证：

1. 配置 `DOUBAO_API_KEY`、`DOUBAO_BASE_URL`、`DOUBAO_MODELS` 和 `DEFAULT_MODEL=doubao:ep-20260225155849-krdlt`。
2. 创建教师教案并生成课件，确认 `TeacherSlideSet` 能保存、读取、更新和导出 PPTX。
3. 打开 `/classroom/teacher/[id]`，确认基础翻页、缩略图、讲稿、全屏和导出入口可用。
4. 点击“转互动课堂”，确认进入 `/generation-preview` 后保留教师课件来源，并生成面向学生的讲解、角色、speech 和 discussion 动作。
5. 打开普通 `/classroom/[id]`，确认普通课堂播放能力未被教师模式弱化。

## 合并完成标准

- 模型默认值、Provider 配置和安全解析规则未被 `main` 覆盖。
- 教师课件数据模型、服务、预览和导出链路可用。
- 教师课件转互动课堂链路可用，且不会误走普通 PDF/需求生成流程。
- 教师功能开关和普通课堂功能边界清晰。
- 验证命令通过，或已在合并记录中明确说明失败原因和后续处理项。
