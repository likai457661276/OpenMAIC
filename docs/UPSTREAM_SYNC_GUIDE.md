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

## 兼容检查脚本

`scripts/check-upstream-compat.sh` 是只读脚本，会优先使用当前分支的 upstream tracking 分支作为本地基线；没有 tracking 分支时回退到 `main`。脚本会报告：

- 当前教师扩展分支中，落在隔离边界之外的改动文件。
- 本地与 `upstream/main` 同时改动的文件。

可通过环境变量覆盖默认引用：

```bash
BASE_REF=develop UPSTREAM_REF=upstream/main scripts/check-upstream-compat.sh
```
