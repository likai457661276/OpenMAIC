# OpenMAIC 主线版本同步指南

本文档用于把官方 `upstream/main` 的更新同步到当前教师扩展分支，并记录合并时必须保留的定制行为、冲突热点与验证方式。项目中的“合并 main”默认均指合并 `upstream/main`；只有用户明确要求时才使用 `origin/main`。

## 分支约定

| 分支 | 用途 |
|------|------|
| `bingo-v1` | 当前教师扩展集成分支；如后续更名，以实际工作分支为准 |
| `upstream/main` | 官方 OpenMAIC 主线，也是默认合并来源 |
| `origin/main` | 当前 fork 的主分支，不作为默认主线合并来源 |
| `sync/upstream-YYYYMMDD` | 单次官方主线同步分支，从当前教师扩展分支创建 |
| `feature/*` | 日常功能开发分支 |

不要把 `origin/main`、`upstream/main` 和当前教师扩展分支混为一谈。创建同步分支前，应使用 `git branch -vv` 和 `git remote -v` 确认实际分支及远程关系。

## 同步流程

1. 确认工作区没有会被合并覆盖的未提交修改，并更新远程引用：

   ```bash
   git status --short
   git fetch upstream main
   ```

2. 从当前教师扩展分支创建同步分支：

   ```bash
   git switch bingo-v1
   git switch -c sync/upstream-YYYYMMDD
   ```

3. 合并官方主线：

   ```bash
   git merge upstream/main
   ```

4. 解决冲突，优先关注适配层和少量原项目改动文件。

5. 运行兼容检查：

   ```bash
   BASE_REF="$(git merge-base HEAD upstream/main)" UPSTREAM_REF=upstream/main scripts/check-upstream-compat.sh
   ```

6. 运行项目验证：

   ```bash
   pnpm exec tsc --noEmit
   pnpm exec vitest run tests/feature-flags.test.ts tests/feature-gate.test.ts tests/teacher/adapters.test.ts tests/teacher/services.test.ts
   pnpm build
   ```

7. Code Review 后把同步分支合并回当前教师扩展集成分支。不得把教师扩展定制反向合入 `upstream/main`；只有用户明确要求时才操作 `origin/main`。

## 冲突处理原则

- 教师扩展业务优先集中在 `app/(teacher)/teacher/`、`app/api/teacher/`、`components/teacher/`、`lib/teacher/`。
- 自动教师桥接业务优先集中在 `app/auto-teacher/`、`app/auto-import-teacher/`、`app/api/auto-teacher/`、`components/auto-teacher/`、`lib/auto-teacher/`。
- 原项目核心能力变化优先通过 `lib/teacher/adapters/` 吸收，不直接扩散到业务组件。
- 如果官方更新修改了生成、导出、播放或 Prompt 等核心目录，先补适配层测试，再改业务层。
- `.env.local`、`server-providers.yml` 不进入提交和冲突示例。

## 默认模型与服务端 Provider 保留规则

当前部署只启用 OpenAI-compatible 的阿里云百炼 Provider（`qwen`）及 QWEN 图片、TTS，默认模型为 `qwen:qwen3.7-flash`。部署参数统一通过 `.env.local` 管理，不额外配置或挂载 `server-providers.yml`；`.env.example`、README 和部署说明仅提供 QWEN 配置示例。通用 Provider 实现、YAML 兼容能力及设置页面仍保留。模型选择、服务端托管配置与客户端设置必须作为一条链路审查，不能只保留设置页中的 Provider 名称。本地 `.env.local` 使用 `QWEN_API_KEY`、`QWEN_BASE_URL`、`QWEN_MODELS=qwen3.7-flash` 和 `DEFAULT_MODEL=qwen:qwen3.7-flash`，不再配置豆包、硅基流动或 Tavily；未配置独立搜索服务时不能误报可用的联网搜索能力。密钥不得写入文档或提交。百炼模型名称应以当前账号实际可调用的模型为准，不得仅凭其他供应商的同名模型补入列表。

| 文件或目录 | 必须保留的当前分支行为 |
|------|------------------------|
| `lib/server/provider-config.ts` | 未配置 `DEFAULT_MODEL` 时回退到 `qwen:qwen3.7-flash`；同时支持环境变量和 `server-providers.yml`；默认模型必须出现在对应服务端 Provider 的公开模型列表中。 |
| `lib/server/resolve-model.ts` | 普通请求的模型解析顺序保留“阶段模型 → 请求模型 → `DEFAULT_MODEL` → 部署 fallback”；带 `x-use-server-model=true` 的自动生成请求必须忽略客户端模型、凭证、连接方式和 thinking，直接按服务端 env 阶段路由或默认模型解析。服务端托管 Provider 的 key 和 base URL 由服务端配置决定，客户端不得覆盖。 |
| `lib/ai/providers.ts`、`lib/ai/model-metadata.ts` | 保留 `qwen3.7-flash` 模型及其视觉、流式输出、工具调用和 Qwen thinking 参数适配；不得因模型目录合并漏掉 `enable_thinking` / `thinking_budget` 映射。其他 Provider 的协议兼容能力继续保留，合并官方新模型时采用并集。 |
| `lib/store/settings.ts`、`app/api/server-providers/route.ts` | 客户端只接收可公开的 Provider、模型和 managed 状态，不得暴露 API key 或服务端 base URL；当前模型失效时应回退到服务端默认模型。 |
| `lib/agent/client/use-agent-runtime.ts`、`app/api/agent/edit/route.ts` | `Edit with AI` 专业模式必须继续通过 `apiPath('/api/agent/edit')` 调用 SSE 接口，保留 `/bingo-agent-class` 子路径部署；同时继续随请求转发当前前端模型配置和 thinking 配置，避免在客户端模型可用时退回到缺失服务端 key 的 Provider。 |
| `.env.example`、`DEPLOYMENT-zh.md`、`README.md`、`README-zh.md`、`docker-compose.yml`、`AGENTS.md` | 部署示例仅使用 QWEN 大模型、图片和 TTS 的 env 配置；不能重新引入其他服务商密钥示例或 YAML 挂载，功能开关、访问控制和通用 Provider 能力继续保留。 |

冲突处理后至少运行：

```bash
pnpm exec vitest run tests/server/provider-config.test.ts tests/server/resolve-model.test.ts tests/store/settings-server-sync.test.ts tests/ai/thinking-config.test.ts tests/ai/openai-provider.test.ts
pnpm exec tsc --noEmit
```

本地切换 Provider 后应重新创建开发容器以更新环境变量，检查 `/bingo-agent-class/api/server-providers` 返回的默认模型与公开列表，确认不含豆包托管配置，并实测 `/bingo-agent-class/api/generate/scene-outlines-stream` 产生 `outline` 和 `done` 事件。刷新页面后，旧模型选择应随服务端默认值更新。

### 大纲流式错误诊断

`app/api/generate/scene-outlines-stream/route.ts` 必须捕获 AI SDK 的 `onError` 回调：`textStream` 不会输出上游错误片段，不能把模型不存在、鉴权失败或关闭端点误判为成功的空文本。错误 SSE 保留上游 HTTP 状态、错误码和原始错误消息，仅移除密钥等敏感信息；不可重试的错误立即结束，可重试错误保留现有重试流程。上游在部分大纲输出后报错时不得发送 `done`。前端继续通过 `evt.error` 显示诊断信息。

合并涉及流式大纲、共享 LLM 包装或生成预览错误展示时，运行：

```bash
pnpm exec vitest run tests/generation/outline-stream-errors.test.ts tests/generation/task-engine-outline-route.test.ts
pnpm exec tsc --noEmit
```

还应使用不存在的 QWEN 模型实测：确认页面收到带 HTTP 状态与供应商错误码的错误，而不是 `LLM returned empty response`，并检查日志中没有无效的重复请求或密钥。

## 教师课件模型与转互动课堂保留规则

教师课件不是普通课堂数据的别名。合并上游的 `Slide`、`Scene`、生成流程或导出逻辑时，必须保留教师课件模型以及从教师预览转为学生互动课堂的完整上下文。

| 文件或目录 | 必须保留的当前分支行为 |
|------|------------------------|
| `lib/teacher/types/slide.ts` | `TeacherSlide.content` 继续承载 `@openmaic/dsl` 的 `Slide`，并保留讲稿 `notes`、时长 `duration`、来源任务/课堂 ID 和教师课件样式；官方新增字段应兼容合并，不得退回与普通 `Scene` 混用。 |
| `lib/teacher/slide-service.ts`、`lib/teacher/export-service.ts` | 教师课件的生成、保存、更新、来源追踪与 PPTX 导出继续围绕同一 `TeacherSlideSet` 工作。 |
| `components/teacher/teacher-classroom-stage.tsx` | “转互动课堂”必须把当前课件页面、讲稿和讨论信息写入转换需求，设置 `agentMode=auto`、启用 TTS，并写入完整的 `generationSession`；从 Auto Teacher 或 Auto Import Teacher 入口进入时还必须把 `autoTeacherEmbedded` 和可用的 `autoTeacherBridge` 延续到转换后的互动课堂，保证隐藏传统返回 UI，并在父系统提供保存参数时仍可保存回父系统。教师课件专业模式必须复用互动课的 `EditChromeRoot` AI 编辑壳，保留 `Edit with AI`、`useAgentRuntime`、会话历史和 slide/interactive 编辑工具链，但必须通过 `showActionsBar={false}` 隐藏讲解脚本编辑模块；互动课专业模式仍保留默认 ActionsBar，不得在合并冲突时退回只挂底层 `EditShell`。 |
| `app/generation-preview/page.tsx`、`app/generation-preview/types.ts` | 保留 `teacherInteractiveConversion`、`teacherInteractiveSource` 和 `originalRequirement`；教师转换不得重新走普通 PDF 解析或大纲重建流程，并与上游新增生成状态取并集。 |

`generationSession` 至少保留 `requirements.interactiveMode=true`、`teacherMode=true`、`teacherInteractiveConversion=true`、`teacherInteractiveSource.stage`、`teacherInteractiveSource.scenes` 和 `originalRequirement`；嵌入式 Auto Teacher / Auto Import Teacher 转换还要保留 `autoTeacherEmbedded` 和可用的 `autoTeacherBridge`。合并后应验证生成内容面向学生讲解，而不是生成教师备课说明。

上游 v0.3.0 将交互内容的 `teacherActions` 旧字段迁移为统一的场景动作管线，并新增前台首屏生成重试。同步后教师课件转互动课堂必须继续复用公共 `fetchSceneContent`、`fetchSceneActions` 和 `generateAndStoreTTS`，同时通过 `apiPath()` 保留 `/bingo-agent-class` 子路径；不得把 `teacherActions` 字段重新写回 `InteractiveContent`。

教师课件转互动课堂的音频完整性是自定义质量门禁：`app/generation-preview/page.tsx` 必须在 `returnActionsOnly` 动作生成后保证每页至少有一条面向学生的 `speech`，并且在保存或回传父系统前确认所有 `speech.audioId` 都能从 IndexedDB 读到真实音频 blob。该转换链路不得接受 `browser-native-tts` 作为最终产物音频来源；若服务端 TTS provider 未启用、不可用或生成后缺音频，应中断转换并显示明确错误，避免导出 ZIP 中出现第一页或任一页面音频 `missing: true` 的静默成功包。

Qwen TTS 是 DashScope 百炼托管接口的定制适配：服务端优先使用 `TTS_QWEN_API_KEY`，未提供专用 TTS key 时可复用 `QWEN_API_KEY`；`TTS_QWEN_BASE_URL` 可配置为 DashScope 根域名、`/api/v1` 或完整 generation endpoint。`lib/audio/tts-providers.ts` 中 Qwen3 TTS 请求体必须保持官方 `model + input{text, voice, language_type}` 结构，不得把通用 `ttsSpeed` 转成未支持的 `parameters.rate`，否则正式环境会在 `/api/generate/tts` 返回上游 400。

```bash
pnpm exec vitest run tests/generation-preview/types.test.ts tests/teacher/services.test.ts tests/teacher/adapters.test.ts tests/teacher/interactive-conversion.test.ts tests/audio/qwen-tts.test.ts tests/server/provider-config.test.ts tests/generation/foreground-retry.test.ts tests/generation/widget-actions-direct-pipeline.test.ts tests/hooks/use-scene-generator-retry.test.ts
pnpm exec tsc --noEmit
```

## Auto Teacher 与 Auto Import Teacher 保留规则

教师扩展包含两个供父系统通过 `iframe` 调用的自动化入口：

- `/auto-teacher`：接收父系统已解析的教案文本和生成参数，创建教师课件，并在教师预览页将导出的课件 ZIP 上传回父系统。
- `/auto-import-teacher`：接收课件 ZIP 地址，导入为教师课件或普通互动课堂，并跳转到对应详情页。

这两个入口共用宽松的 iframe 消息协议和保存回传策略。合并官方更新时，必须把它们视为一条完整链路，不能只保留入口页面。

| 文件或目录 | 必须保留的当前分支行为 |
|------|------------------------|
| `app/auto-teacher/`、`app/auto-import-teacher/` | 两个入口不读取父窗口来源白名单，均应支持任意父站点通过带 `basePath` 的地址嵌入。 |
| `components/auto-teacher/` | 只处理 `AUTO_TEACHER_GENERATE` 消息；不校验 `event.origin`，但仍须严格解析消息结构；重复任务不能并发执行；状态、成功和错误消息必须回传给原消息窗口及原 origin。 |
| `lib/auto-teacher/origins.ts` | 来源列表只服务于服务端 ZIP/PDF 下载防护，不得重新用于 iframe 嵌入或 `postMessage` 来源校验。 |
| `lib/auto-teacher/protocol.ts` | 保留教案内容与 ZIP 导入协议兼容：自动教案允许 `pdf_text`/`pdfText` 或 `file_url` 二选一，并要求 `token`、`upload_url`/`uploadUrl`；同时保留 `courseware_name`、`prompt`。父消息历史 `model` 字段仅兼容接收，不解析或应用，不能恢复旧的模型白名单或写死默认模型；自动教师模型由服务端 env 决定。ZIP 地址兼容 `zip_url`、`zipUrl`、`zipurl`，并保留 `teachType=teacher|classroom`、可选 `fileName`，以及用于保存回父系统的可选 `token`、`upload_url`/`uploadUrl` 成对字段。所有 URL 字段只允许 HTTP(S)。 |
| `components/auto-teacher/auto-teacher-bridge.tsx`、`app/api/auto-teacher/parse-pdf-url/route.ts` | 自动教案入口优先消费父系统传入的教案文本；缺少文本但存在 `file_url` 时，必须进入 `parsing_pdf` 阶段，通过服务端代理下载并使用 `unpdf` 解析。下载时兼容转发父消息 token，但不得记录 token；保留逐次重定向 SSRF 校验、可信来源例外、50MB 大小限制和 Content-Type 校验。 |
| `app/api/auto-teacher/download-zip/route.ts` | 保留服务端 ZIP 下载代理、逐次重定向 SSRF 校验、可信 ZIP origin 白名单、500MB 大小限制、Content-Type 校验及 `Cache-Control: no-store`。 |
| `app/generation-preview/page.tsx`、`app/generation-preview/types.ts` | 保留 `teacherMode`、`teacherInteractiveConversion`、`autoTeacherBridge` 和 `originalRequirement`；自动教师生成禁用图片、视频和 TTS，生成完成后进入教师课件路由；自动教师的大纲生成、审阅大纲、生成失败等生成预览链路不得显示“返回首页”“返回修改需求”“返回重试”等返回入口；与官方新增生成状态字段采用并集，不能互相覆盖。 |
| `components/stage.tsx`、`components/stage/header-controls.tsx`、`components/header.tsx`、`components/edit/`、`components/teacher/teacher-classroom-stage.tsx`、`components/auto-teacher/auto-import-teacher-bridge.tsx`、`lib/import/use-import-classroom.ts`、`lib/auto-teacher/use-auto-teacher-classroom-save.ts` | Auto Teacher 和 Auto Import Teacher 的预览由父系统托管，带 `autoTeacher=1` 或 `autoImport=1` 进入普通课堂、普通课堂 Pro 模式或教师课件预览时，必须隐藏返回首页、返回教师备课等返回入口；转换到 `generation-preview` 后也要通过独立的 `autoTeacherEmbedded` 标记继续隐藏传统返回 UI。Auto Import Teacher 复用课堂 ZIP 导入逻辑时，导入成功必须静默关闭 loading toast，错误仍需提示，避免父系统嵌入预览被成功 toast 遮挡；普通手动导入仍保留成功提示。Auto Teacher 生成或 Auto Import Teacher 传入保存字段后，直接导入的互动课堂、教师课件预览页，以及由教师课件转换出的互动课堂都必须延续 `autoTeacherBridge`；点击下载旁的保存按钮后继续使用父系统传入的 `upload_url`/`uploadUrl` 和 `token` 上传，并通过 `AUTO_TEACHER_SAVE_SUCCESS` / `AUTO_TEACHER_SAVE_ERROR` 回传结果；保存按钮不得影响普通互动课堂或未传保存字段的 Auto Import 课堂。不得记录 token 或把 token 写入持久化日志。 |
| `lib/types/stage.ts`、`lib/utils/database.ts`、`lib/utils/stage-storage.ts` | 保留 `teacherMode` 的类型、持久化和列表恢复；如果官方新增其他模式字段，应采用并集。ZIP 导入时必须按 `teachType` 设置 `teacherMode` 并路由到教师或普通课堂详情页。 |
| `lib/app-paths.ts`、`next.config.ts`、`middleware.ts` | 保留 `basePath` URL 处理；静态与运行时响应头均使用 `Content-Security-Policy: frame-ancestors *`，且不能返回 `X-Frame-Options`，保证自动流程跳转后的所有页面仍可被任意父站点嵌入。 |

环境变量仍遵循以下边界：

自动教师生成模型不受父 iframe 或 localStorage 中旧模型选择影响：`components/auto-teacher/auto-teacher-bridge.tsx` 不再调用 `setModel`，自动会话及其产出的 `Stage` 保留 `useServerModel`。`app/generation-preview/page.tsx`、`lib/utils/model-config.ts` 和 `lib/hooks/use-scene-generator.ts` 必须在大纲、首屏与后续内容/动作请求中发送 `x-use-server-model=true`，不发送客户端 LLM 模型、凭证或 thinking。`lib/server/resolve-model.ts` 负责最终执行该规则；普通手动入口的选择行为继续保留。旧自动会话可根据 `autoTeacherEmbedded` / `autoTeacherBridge.enabled` 恢复服务端模型策略。上述文件、`app/generation-preview/types.ts`、`lib/types/stage.ts` 是相关上游合并冲突点，不得在更新 DSL 或生成后台逻辑时丢失该标记。

- `NEXT_PUBLIC_AUTO_TEACHER_ALLOWED_ORIGINS`：兼容旧部署的可信下载来源配置，仅参与服务端 ZIP/PDF 来源集合；不再限制 iframe CSP 或 `postMessage`。
- `AUTO_TEACHER_ALLOWED_ZIP_ORIGINS`：允许服务端下载 ZIP 的额外 origin；历史环境若仍配置了 `AUTO_TEACHER_ALLOWED_PDF_ORIGINS`，ZIP 下载代理可兼容读取，但自动教案生成不得使用它下载 PDF。
- 白名单只填写 `scheme://host[:port]`，不得包含路径；不得在文档、日志或提交中写入真实 token。

冲突处理后至少运行：

```bash
pnpm exec vitest run tests/auto-teacher/protocol.test.ts tests/api/auto-teacher-parse-pdf-url.test.ts tests/api/auto-teacher-download-zip.test.ts tests/generation-preview/types.test.ts tests/server/security-headers.test.ts
pnpm exec tsc --noEmit
pnpm lint
```

涉及自动教师模型来源时额外运行：

```bash
pnpm exec vitest run tests/utils/model-config.test.ts tests/server/resolve-model.test.ts tests/hooks/use-scene-generator-retry.test.ts tests/generation/outline-stream-errors.test.ts
```

部署验证必须分别覆盖直接页面及 iframe 入口：父系统传入旧 `model` 仍应使用 `DEFAULT_MODEL=qwen:qwen3.7-flash`；生成预览及后续课件请求都带服务端模型标记。正式镜像必须同时包含模型策略及大纲真实错误回传修复，不能只修改 env 并重启旧镜像。

还应人工验证两条完整链路：

1. 从任意父窗口 origin 嵌入入口，分别验证直接发送 `pdf_text`/`pdfText` 与仅发送 `file_url` 两种生成消息；确认不出现来源拒绝或缺少 `pdf_text` 错误，URL 模式能够完成 `parse-pdf-url`、生成、教师预览、ZIP 上传和保存结果回传。确认生成预览阶段不显示“返回首页”“返回修改需求”“返回重试”等返回入口，预览 URL 带有 `autoTeacher=1`，且不显示“返回教师备课”按钮。
2. 父窗口发送 ZIP 导入消息，分别以 `teachType=teacher` 和 `teachType=classroom` 导入，确认 `teacherMode`、目标路由、`AUTO_TEACHER_READY.nextPath` 正确，并确认普通课堂播放态、普通课堂 Pro 模式和教师课件预览都不显示返回入口。

## 普通互动课堂 TTS 默认与生成一致性

普通互动课堂的语音合成遵循“可用即默认开启、用户选择优先、生成过程前后一致”的约定。同步上游代码时必须同时检查设置同步、生成预览和课堂持久化，避免只合并 UI 开关而造成前几页无语音、后几页有语音。

- `lib/store/settings.ts`：`ttsEnabled` 在本地初始阶段等待 Provider 探测；只要服务端返回至少一个可用 TTS Provider，且用户没有主动设置过总开关，就默认开启。`ttsEnabledUserSet` 用于区分系统默认值与用户显式开启/关闭，后续 Provider 同步不得覆盖用户选择。
- `app/generation-preview/page.tsx`：正式生成场景前必须完成一次 `/api/server-providers` 同步，确保默认 TTS Provider、音色和总开关已经确定，不能让第一页先于 Provider 同步进入生成。
- `lib/hooks/use-scene-generator.ts`：每个新场景生成后按最新 TTS 状态合成语音；生成过程中从关闭切换为开启时，必须为本次课堂中已经完成且缺少音频的场景回补 TTS，并保存更新后的场景。
- 浏览器原生 TTS 只在课堂播放时实时朗读，不生成 `audioId` 对应的音频文件；不能把这种情况误判为服务端 TTS 回补失败。
- 教师模式和 Auto Teacher 继续遵循各自的媒体能力开关；Auto Teacher 默认禁用 TTS，本节规则不得把它重新开启。
- 回归验证至少覆盖：服务端存在 TTS 时新课堂默认开启、用户显式关闭后不被同步覆盖、生成中开启后第一页得到回补、无可用 Provider 时保持关闭、浏览器原生 TTS 不触发服务端合成。

## 首页交互模式、职教任务与语音输入

普通课堂首页的输入工具栏包含交互模式、职教任务和语音输入三项定制能力。它们会改变生成参数或输入内容，不能在合并首页 UI 时只保留外观。

| 文件或目录 | 必须保留的当前分支行为 |
|------|------------------------|
| `app/page.tsx` | 普通首页展示交互模式和语音输入；交互模式使用 `interactiveModeEnabled` 在 `localStorage` 中持久化，并写入 `generationSession.requirements.interactiveMode`。教师首页不展示这两项学生侧控件。 |
| `app/page.tsx`、`playwright.config.ts` | `NEXT_PUBLIC_SHOW_VOCATIONAL_TEST_UI` 控制职教任务入口；启用后提交请求必须同时写入 `interactiveMode=true` 和 `taskEngineMode=true`。E2E 启动环境必须保留相关功能变量。 |
| `components/audio/speech-button.tsx` | 语音按钮仅在 ASR 可用时启用；转写结果追加到需求输入；录音中必须仍可停止，并保留随录音/处理状态变化的可访问名称。 |
| `components/roundtable/index.tsx` | 教师及参与者头像统一使用 `AvatarDisplay` 解析，避免 `basePath` 部署下头像路径失效。 |
| `lib/import/use-import-pptx.ts` | 浏览器加载 `/vendor/maic-importer/index.js` 时必须通过 `assetPath()` 处理固定子路径部署。 |

合并首页、输入工具栏、语音、职教任务、头像或 PPTX 导入代码后至少运行：

```bash
pnpm exec vitest run tests/classroom/roundtable-avatar-path.test.ts
pnpm exec playwright test e2e/tests/home-to-generation.spec.ts
pnpm exec tsc --noEmit
```

人工检查普通首页刷新后交互模式仍保持；职教任务生成会同时开启互动与任务引擎；`/teacher` 首页不出现交互模式和语音按钮；在 `/bingo-agent-class` 下头像与 PPTX 导入脚本均无 404。

## 教师教案时长与课堂测验一致性

教师扩展的教案与实时测验属于当前分支定制能力。同步上游或调整教师业务时，必须保留以下数据约束，避免接口返回成功但数据未写入，或实时成绩与课后报告不一致。

| 文件 | 必须保留的当前分支行为 |
|------|------------------------|
| `lib/teacher/lesson-service.ts`、`app/api/teacher/lessons/route.ts` | 新建和更新教案时，课时必须是至少 20 分钟的整数；自动生成的四个教学环节各不少于 5 分钟，且环节时长总和必须严格等于教案总课时。API 与服务层都要保留校验，不能只依赖前端输入限制。 |
| `lib/teacher/quiz-service.ts` | 客观题与简答题的标准化、正确性和得分计算必须保留单一判分入口，供实时提交和课后报告共同调用，避免两套规则漂移。 |
| `lib/teacher/realtime-service.ts` | 保存答案前必须确认参与者属于当前场次；未知或过期的 `participantId` 必须失败，不能返回成功但不写入任何参与者。简答题空答案不得得分。 |
| `lib/teacher/scoring-service.ts` | 报告生成必须复用与实时提交相同的判分函数，确保参与者即时总分、题目分析和最终报告一致。 |
| `lib/i18n/locales/*.json` | 教师扩展合并新增设置项或互动页文案时，所有语言文件必须与 `en-US.json` 的叶子键完全对齐；不允许依赖英文 fallback 掩盖遗漏，也不保留源语言中不存在的废弃键。 |

这些文件均可能与后续上游教师模式、测验或国际化改动发生冲突。解决冲突后至少运行：

```bash
pnpm exec vitest run tests/teacher/services.test.ts
pnpm check:i18n-keys
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

回归检查至少覆盖：20 分钟教案的四个环节均不少于 5 分钟且总和为 20；小于 20 分钟的新建或更新请求被拒绝；空简答题在实时结果和最终报告中均为 0 分；未知参与者提交答案时返回失败。

## 部署配置保留规则

当前分支同时支持 Docker 开发环境和生产式 standalone 容器，并固定部署在 `/bingo-agent-class` 子路径。合并官方更新时，部署文件和应用运行时配置必须作为同一组变更审查，不能只验证本机 `pnpm dev`。

| 文件或目录 | 必须保留的当前分支行为 |
|------|------------------------|
| `package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml` | Node.js 保持 `>=20`，pnpm 保持 `>=10`；当前 Docker 镜像使用 Node 22 和 pnpm 10.28.0。合并新增 workspace 包后，postinstall、build、vendor 同步脚本及锁文件必须一致。 |
| `Dockerfile` | 保留多阶段 standalone 构建、国内 Alpine/npm 镜像参数、原生图形依赖、非 root `nextjs` 用户、`HOSTNAME=0.0.0.0`、容器端口 `10050`，以及 `NEXT_PUBLIC_MAIC_EDITOR_ENABLED` 构建参数。 |
| `Dockerfile` 与新增 workspace 构建脚本 | 依赖阶段必须复制或延后使用 postinstall 所需的 `scripts/` 和 workspace 源文件。官方若新增 `@openmaic/dsl`、`@openmaic/importer`、`@openmaic/renderer` 等构建或同步脚本，必须实际执行生产镜像构建，避免出现本机成功、镜像因缺少脚本或产物失败。 |
| `Dockerfile.dev`、`docker-compose.dev.yml` | 保留 Debian 开发镜像及 canvas 相关编译依赖；开发服务监听 `0.0.0.0:10050`，宿主机映射 `10051:10050`；保留源码、`node_modules`、`.next` 和 pnpm store 独立卷，并使用 `pnpm install --frozen-lockfile`。 |
| `docker-compose.yml` | 保留生产镜像的编辑器构建参数、1GB 内存/交换区限制、`0.0.0.0:10051:10050` 端口映射、`.env.local` 注入、`/app/data` 持久化卷和 `restart: unless-stopped`；如部署环境要求仅供本机 Nginx 访问，可在服务器部署配置中收紧为 `127.0.0.1:10051:10050`，不得在同步时无说明地改变监听策略。 |
| `.dockerignore`、`.gitignore` | `.env*`（仅放行 `.env.example`）、`server-providers*.yml`、证书、日志和运行数据不得进入构建上下文或版本库；不得通过放宽 ignore 规则修复 Docker 构建。 |
| `next.config.ts`、`lib/app-paths.ts` | 保留固定 `basePath=/bingo-agent-class`、`NEXT_PUBLIC_BASE_PATH`、非 Vercel standalone 输出和 workspace transpile 配置；新增页面、API、静态资源及父窗口回传路径必须使用 basePath 安全的路径工具。 |
| `middleware.ts` | 保留运行时 CSP、访问码 HMAC 校验和 `/api/health` 放行；运行时 CSP 必须持续允许任意 iframe 父站点，不能重新引入环境白名单。 |
| `.env.local`、`server-providers.yml` | 两者均为部署侧配置且不得提交。Compose 的基础设施环境变量不能用空值覆盖 `env_file` 中的 Provider、默认模型、白名单、访问码或设置页密码。挂载 `server-providers.yml` 时必须使用只读方式。 |
| `DEPLOYMENT-zh.md`、`docs/AUTO_TEACHER_PRODUCTION_SETUP.md` | 保留 Nginx 不移除 `/bingo-agent-class` 前缀的约定，以及 Auto Teacher 父窗口 URL、宽松 iframe CSP 和无需来源白名单的部署说明；代码行为变化时同步更新文档。 |

部署配置的合并验收至少包括：

```bash
docker compose config
docker compose -f docker-compose.dev.yml config
docker compose build openmaic
docker compose -f docker-compose.dev.yml build openmaic
```

容器启动后至少检查：

```bash
curl -I http://127.0.0.1:10051/bingo-agent-class/
curl -I http://127.0.0.1:10051/bingo-agent-class/api/health
curl -I http://127.0.0.1:10051/bingo-agent-class/auto-teacher
curl -I http://127.0.0.1:10051/bingo-agent-class/auto-import-teacher
```

同时确认：

1. 静态资源和 API 请求都保留 `/bingo-agent-class` 前缀，没有 404 或重复前缀。
2. `/app/data` 中的课堂数据在容器重建后仍存在。
3. 正式环境未把 `.env.local`、`server-providers.yml`、token 或 API Key 打入镜像层和构建日志。
4. Nginx 反向代理不 rewrite 子路径，长时间生成请求的读写超时配置符合部署文档。

## 媒体 Provider 配置保留规则

当前教师扩展部署默认使用千问图片生成。合并官方更新时，必须保留以下行为，避免被官方默认 Provider 或本地免密 Provider 回退覆盖：

| 文件 | 必须保留的当前分支行为 |
|------|------------------------|
| `.env.local` | 本地默认图片配置为 `DEFAULT_IMAGE_PROVIDER=qwen-image`、`DEFAULT_IMAGE_MODEL=qwen-image-2.0-2026-03-03`；`IMAGE_QWEN_IMAGE_BASE_URL` 指向 DashScope multimodal generation 完整 HTTPS 地址；`IMAGE_QWEN_IMAGE_MODELS` 只包含已开通的 `qwen-image-2.0-pro-2026-03-03` 和 `qwen-image-2.0-2026-03-03`。该文件仍不得提交。 |
| `lib/server/provider-config.ts` | 保留 Qwen Image 复用通用 `QWEN_API_KEY` 的 fallback；没有单独配置 `IMAGE_QWEN_IMAGE_API_KEY` 时，图片生成仍应可通过服务端托管的 Qwen 凭证工作。 |
| `lib/media/adapters/qwen-image-adapter.ts` | 默认图片模型保留为 `qwen-image-2.0-2026-03-03`；适配器必须兼容完整 generation endpoint，不能重复拼接 `/api/v1/services/aigc/multimodal-generation/generation`。 |
| `lib/store/settings.ts` | 服务端下发的 image provider 默认项和模型白名单必须参与前端选择恢复；`DEFAULT_IMAGE_PROVIDER` / `DEFAULT_IMAGE_MODEL` 应优先于“第一个可用图片 Provider”。 |
| `lib/server/classroom-media-generation.ts` | 正式课件生成的服务端媒体流程必须使用 `DEFAULT_IMAGE_PROVIDER` / `DEFAULT_IMAGE_MODEL` 和服务端模型白名单选择图片 provider/model，不能退回“第一个服务端 Provider + 内置第一个模型”。 |
| `components/generation/media-popover.tsx` | 图片下拉只展示已显式配置可用的 Provider；未配置本地 `Lemonade` 时，不显示 `Qwen Image GGUF`、`Stable Diffusion (sd-cpp)`；媒体弹窗底部“高级设置”入口保持隐藏。 |

冲突处理后至少运行：

```bash
pnpm exec vitest run tests/media/qwen-image-adapter.test.ts tests/media/image-providers.test.ts tests/server/provider-config.test.ts tests/server/classroom-media-generation.test.ts tests/store/settings-server-sync.test.ts tests/store/settings-validation.test.ts
pnpm lint
```

## 兼容检查脚本

`scripts/check-upstream-compat.sh` 是只读脚本。未传参数时，它会优先使用当前分支的 tracking 分支作为本地基线，没有 tracking 分支时回退到 `main`。当前教师扩展分支通常跟踪自己的远程同名分支，此默认值只能方便检查尚未推送或未提交的变化，不能完整代表“相对 main 的全部定制差异”。正式同步检查必须显式传入最近共同基线和本次合并来源。

合并官方 `upstream/main` 前推荐运行：

```bash
BASE_REF="$(git merge-base HEAD upstream/main)" UPSTREAM_REF=upstream/main scripts/check-upstream-compat.sh
```

只有用户明确要求合并 `origin/main` 时，才改用：

```bash
BASE_REF="$(git merge-base HEAD origin/main)" UPSTREAM_REF=origin/main scripts/check-upstream-compat.sh
```

脚本会报告：

- 当前教师扩展分支中，落在隔离边界之外的改动文件。
- 本地与 `UPSTREAM_REF` 指定的主线来源同时改动的文件。

脚本中的教师扩展隔离边界必须与本文保持一致。除传统教师目录外，还应包含 `app/auto-teacher/`、`app/auto-import-teacher/`、`app/api/auto-teacher/`、`components/auto-teacher/` 和 `lib/auto-teacher/`；无论文件是否位于隔离边界内，只要本地与上游同时修改，仍必须列为冲突候选并人工审查。

如果需要审查某次历史同步，可把 `BASE_REF` 替换为该次同步前已纳入的主线提交 SHA。不要使用当前教师扩展分支的远程同名 tracking ref 代替主线基线，否则已提交的定制文件不会进入比较结果。
