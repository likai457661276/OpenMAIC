# OpenMAIC 官方版本同步指南

本文档用于在教师扩展版本中同步官方 OpenMAIC 更新，并尽量降低长期维护成本。

## 分支约定

| 分支 | 用途 |
|------|------|
| `main` | 教师扩展生产分支 |
| `develop` | 教师扩展开发集成分支 |
| `upstream/main` | 官方 OpenMAIC 追踪分支 |
| `sync/upstream-vX.X.X` | 单次官方更新同步分支 |
| `feature/*` | 日常功能开发分支 |

## 同步流程

1. 更新官方远程：

   ```bash
   git fetch upstream main
   ```

2. 从教师扩展开发分支创建同步分支：

   ```bash
   git switch develop
   git switch -c sync/upstream-vX.X.X
   ```

3. 合并官方更新：

   ```bash
   git merge upstream/main
   ```

4. 解决冲突，优先关注适配层和少量原项目改动文件。

5. 运行兼容检查：

   ```bash
   scripts/check-upstream-compat.sh
   ```

6. 运行项目验证：

   ```bash
   pnpm exec tsc --noEmit
   pnpm exec vitest run tests/feature-flags.test.ts tests/feature-gate.test.ts tests/teacher/adapters.test.ts tests/teacher/services.test.ts
   pnpm build
   ```

7. Code Review 后合并到 `develop`，再按发布流程进入 `main`。

## 冲突处理原则

- 教师扩展业务优先集中在 `app/(teacher)/teacher/`、`app/api/teacher/`、`components/teacher/`、`lib/teacher/`。
- 原项目核心能力变化优先通过 `lib/teacher/adapters/` 吸收，不直接扩散到业务组件。
- 如果官方更新修改了生成、导出、播放或 Prompt 等核心目录，先补适配层测试，再改业务层。
- `.env.local`、`server-providers.yml` 不进入提交和冲突示例。

## 媒体 Provider 配置保留规则

当前教师扩展部署默认使用千问图片生成。合并官方更新时，必须保留以下行为，避免被官方默认 Provider 或本地免密 Provider 回退覆盖：

| 文件 | 必须保留的当前分支行为 |
|------|------------------------|
| `.env.local` | 本地默认图片配置为 `DEFAULT_IMAGE_PROVIDER=qwen-image`、`DEFAULT_IMAGE_MODEL=qwen-image-2.0-2026-03-03`；`IMAGE_QWEN_IMAGE_BASE_URL` 指向 DashScope multimodal generation 完整 HTTPS 地址；`IMAGE_QWEN_IMAGE_MODELS` 只包含已开通的 `qwen-image-2.0-pro-2026-03-03` 和 `qwen-image-2.0-2026-03-03`。该文件仍不得提交。 |
| `lib/server/provider-config.ts` | 保留 Qwen Image 复用通用 `QWEN_API_KEY` 的 fallback；没有单独配置 `IMAGE_QWEN_IMAGE_API_KEY` 时，图片生成仍应可通过服务端托管的 Qwen 凭证工作。 |
| `lib/media/adapters/qwen-image-adapter.ts` | 默认图片模型保留为 `qwen-image-2.0-2026-03-03`；适配器必须兼容完整 generation endpoint，不能重复拼接 `/api/v1/services/aigc/multimodal-generation/generation`。 |
| `lib/store/settings.ts` | 服务端下发的 image provider 默认项和模型白名单必须参与前端选择恢复；`DEFAULT_IMAGE_PROVIDER` / `DEFAULT_IMAGE_MODEL` 应优先于“第一个可用图片 Provider”。 |
| `components/generation/media-popover.tsx` | 图片下拉只展示已显式配置可用的 Provider；未配置本地 `Lemonade` 时，不显示 `Qwen Image GGUF`、`Stable Diffusion (sd-cpp)`；媒体弹窗底部“高级设置”入口保持隐藏。 |

冲突处理后至少运行：

```bash
pnpm exec vitest run tests/media/qwen-image-adapter.test.ts tests/media/image-providers.test.ts tests/server/provider-config.test.ts tests/store/settings-server-sync.test.ts tests/store/settings-validation.test.ts
pnpm lint
```

## 兼容检查脚本

`scripts/check-upstream-compat.sh` 是只读脚本，会优先使用当前分支的 upstream tracking 分支作为本地基线；没有 tracking 分支时回退到 `main`。脚本会报告：

- 当前教师扩展分支中，落在隔离边界之外的改动文件。
- 本地与 `upstream/main` 同时改动的文件。

可通过环境变量覆盖默认引用：

```bash
BASE_REF=develop UPSTREAM_REF=upstream/main scripts/check-upstream-compat.sh
```
