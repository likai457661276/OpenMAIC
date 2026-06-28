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

当前部署默认使用 OpenAI-compatible 的豆包 Provider。模型选择、服务端托管配置与客户端设置必须作为一条链路审查，不能只保留设置页中的 Provider 名称。

| 文件或目录 | 必须保留的当前分支行为 |
|------|------------------------|
| `lib/server/provider-config.ts` | 未配置 `DEFAULT_MODEL` 时回退到 `doubao:ep-20260225155849-krdlt`；同时支持环境变量和 `server-providers.yml`；默认模型必须出现在对应服务端 Provider 的公开模型列表中。 |
| `lib/server/resolve-model.ts` | 模型解析顺序保留“阶段模型 → 请求模型 → `DEFAULT_MODEL` → 部署 fallback”；服务端托管 Provider 的 key 和 base URL 由服务端配置决定，客户端不得覆盖。 |
| `lib/ai/providers.ts`、`lib/ai/model-metadata.ts` | 保留 `doubao` Provider、Ark OpenAI-compatible 连接方式、Seed 模型列表及 thinking/reasoning 参数映射；合并官方新模型时采用并集。 |
| `lib/store/settings.ts`、`app/api/server-providers/route.ts` | 客户端只接收可公开的 Provider、模型和 managed 状态，不得暴露 API key 或服务端 base URL；当前模型失效时应回退到服务端默认模型。 |
| `.env.example`、`DEPLOYMENT-zh.md` | 保留 `DOUBAO_API_KEY`、`DOUBAO_BASE_URL`、`DOUBAO_MODELS` 和 `DEFAULT_MODEL` 的无密钥示例。 |

冲突处理后至少运行：

```bash
pnpm exec vitest run tests/server/provider-config.test.ts tests/server/resolve-model.test.ts tests/store/settings-server-sync.test.ts tests/ai/thinking-config.test.ts
pnpm exec tsc --noEmit
```

## 教师课件模型与转互动课堂保留规则

教师课件不是普通课堂数据的别名。合并上游的 `Slide`、`Scene`、生成流程或导出逻辑时，必须保留教师课件模型以及从教师预览转为学生互动课堂的完整上下文。

| 文件或目录 | 必须保留的当前分支行为 |
|------|------------------------|
| `lib/teacher/types/slide.ts` | `TeacherSlide.content` 继续承载 `@openmaic/dsl` 的 `Slide`，并保留讲稿 `notes`、时长 `duration`、来源任务/课堂 ID 和教师课件样式；官方新增字段应兼容合并，不得退回与普通 `Scene` 混用。 |
| `lib/teacher/slide-service.ts`、`lib/teacher/export-service.ts` | 教师课件的生成、保存、更新、来源追踪与 PPTX 导出继续围绕同一 `TeacherSlideSet` 工作。 |
| `components/teacher/teacher-classroom-stage.tsx` | “转互动课堂”必须把当前课件页面、讲稿和讨论信息写入转换需求，设置 `agentMode=auto`、启用 TTS，并写入完整的 `generationSession`。 |
| `app/generation-preview/page.tsx`、`app/generation-preview/types.ts` | 保留 `teacherInteractiveConversion`、`teacherInteractiveSource` 和 `originalRequirement`；教师转换不得重新走普通 PDF 解析或大纲重建流程，并与上游新增生成状态取并集。 |

`generationSession` 至少保留 `requirements.interactiveMode=true`、`teacherMode=true`、`teacherInteractiveConversion=true`、`teacherInteractiveSource.stage`、`teacherInteractiveSource.scenes` 和 `originalRequirement`。合并后应验证生成内容面向学生讲解，而不是生成教师备课说明。

```bash
pnpm exec vitest run tests/generation-preview/types.test.ts tests/teacher/services.test.ts tests/teacher/adapters.test.ts
pnpm exec tsc --noEmit
```

## Auto Teacher 与 Auto Import Teacher 保留规则

教师扩展包含两个供父系统通过 `iframe` 调用的自动化入口：

- `/auto-teacher`：接收 PDF 地址和生成参数，创建教师课件，并在教师预览页将导出的课件 ZIP 上传回父系统。
- `/auto-import-teacher`：接收课件 ZIP 地址，导入为教师课件或普通互动课堂，并跳转到对应详情页。

这两个入口共用来源白名单、消息协议和服务端下载安全策略。合并官方更新时，必须把它们视为一条完整链路，不能只保留入口页面。

| 文件或目录 | 必须保留的当前分支行为 |
|------|------------------------|
| `app/auto-teacher/`、`app/auto-import-teacher/` | 页面必须在服务端读取运行时 `NEXT_PUBLIC_AUTO_TEACHER_ALLOWED_ORIGINS`，不能退回仅在构建期固化白名单；两个入口均应支持带 `basePath` 的部署。 |
| `components/auto-teacher/` | 只处理 `AUTO_TEACHER_GENERATE` 消息；必须先校验 `event.origin` 再解析或执行消息；重复任务不能并发执行；状态、成功和错误消息必须回传给原消息窗口及原 origin。 |
| `lib/auto-teacher/origins.ts` | 正式环境只允许显式配置和内置正式域名；测试域名只在测试环境启用；开发环境可在未配置白名单时联调，但不能把该宽松策略带入 production。 |
| `lib/auto-teacher/protocol.ts` | 保留 PDF 生成与 ZIP 导入协议兼容：PDF 参数包括 `file_url`、`token`、`upload_url`，可选 `courseware_name`、`model`、`prompt`；ZIP 地址兼容 `zip_url`、`zipUrl`、`zipurl`，并保留 `teachType=teacher|classroom` 与可选 `fileName`。所有 URL 只允许 HTTP(S)。 |
| `app/api/auto-teacher/parse-pdf-url/route.ts` | 保留 SSRF 校验、逐次重定向校验、可信 PDF origin 白名单、50MB 大小限制和 PDF Content-Type 校验；不得因联调内网地址而全局关闭 SSRF 防护。 |
| `app/api/auto-teacher/download-zip/route.ts` | 保留服务端 ZIP 下载代理、逐次重定向 SSRF 校验、可信 ZIP origin 白名单、500MB 大小限制、Content-Type 校验及 `Cache-Control: no-store`。 |
| `app/generation-preview/page.tsx`、`app/generation-preview/types.ts` | 保留 `teacherMode`、`teacherInteractiveConversion`、`autoTeacherBridge` 和 `originalRequirement`；自动教师生成禁用图片、视频和 TTS，生成完成后进入教师课件路由；自动教师的大纲生成、审阅大纲、生成失败等生成预览链路不得显示“返回首页”“返回修改需求”“返回重试”等返回入口；与官方新增生成状态字段采用并集，不能互相覆盖。 |
| `components/stage.tsx`、`components/header.tsx`、`components/edit/`、`components/teacher/teacher-classroom-stage.tsx` | Auto Teacher 和 Auto Import Teacher 的预览由父系统托管，带 `autoTeacher=1` 或 `autoImport=1` 进入普通课堂、普通课堂 Pro 模式或教师课件预览时，必须隐藏返回首页、返回教师备课等返回入口。导出 ZIP 后继续使用父系统传入的 `upload_url` 和 `token` 上传，并通过 `AUTO_TEACHER_SAVE_SUCCESS` / `AUTO_TEACHER_SAVE_ERROR` 回传结果；不得记录 token 或把 token 写入持久化日志。 |
| `lib/types/stage.ts`、`lib/utils/database.ts`、`lib/utils/stage-storage.ts` | 保留 `teacherMode` 的类型、持久化和列表恢复；如果官方新增其他模式字段，应采用并集。ZIP 导入时必须按 `teachType` 设置 `teacherMode` 并路由到教师或普通课堂详情页。 |
| `lib/app-paths.ts`、`next.config.ts`、`middleware.ts` | 保留 `basePath` URL 处理和运行时 CSP `frame-ancestors`；配置跨源 iframe 后不能再用 `X-Frame-Options: SAMEORIGIN` 阻断合法父窗口。 |

环境变量仍遵循以下边界：

- `NEXT_PUBLIC_AUTO_TEACHER_ALLOWED_ORIGINS`：父窗口 origin 白名单，同时用于 iframe CSP 和 `postMessage` 来源校验。
- `AUTO_TEACHER_ALLOWED_PDF_ORIGINS`：允许服务端读取 PDF 的额外 origin。
- `AUTO_TEACHER_ALLOWED_ZIP_ORIGINS`：允许服务端下载 ZIP 的额外 origin；未配置时可回退到 PDF origin 配置。
- 白名单只填写 `scheme://host[:port]`，不得包含路径；不得在文档、日志或提交中写入真实 token。

冲突处理后至少运行：

```bash
pnpm exec vitest run tests/auto-teacher/protocol.test.ts tests/api/auto-teacher-parse-pdf-url.test.ts tests/api/auto-teacher-download-zip.test.ts tests/generation-preview/types.test.ts tests/server/security-headers.test.ts
pnpm exec tsc --noEmit
pnpm lint
```

还应人工验证两条完整链路：

1. 父窗口发送 PDF 生成消息，OpenMAIC 完成解析、生成、教师预览、ZIP 上传和保存结果回传；确认生成预览阶段不显示“返回首页”“返回修改需求”“返回重试”等返回入口，预览 URL 带有 `autoTeacher=1`，且不显示“返回教师备课”按钮。
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
| `middleware.ts` | 保留运行时 CSP、访问码 HMAC 校验和 `/api/health` 放行；生产环境变量修改后只需重启容器即可更新 iframe 白名单，不能重新退化为仅构建期生效。 |
| `.env.local`、`server-providers.yml` | 两者均为部署侧配置且不得提交。Compose 的基础设施环境变量不能用空值覆盖 `env_file` 中的 Provider、默认模型、白名单、访问码或设置页密码。挂载 `server-providers.yml` 时必须使用只读方式。 |
| `DEPLOYMENT-zh.md`、`docs/AUTO_TEACHER_PRODUCTION_SETUP.md` | 保留 Nginx 不移除 `/bingo-agent-class` 前缀的约定，以及 Auto Teacher 父窗口 URL、CSP 和运行时白名单部署说明；代码行为变化时同步更新文档。 |

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
