# 教师扩展架构说明

教师扩展模块以“隔离业务、适配核心”为原则建设。新增教师功能应优先落在扩展目录中，只有入口、开关和必要的运行时保护可以少量触达原项目代码。

## 主要边界

| 区域 | 说明 |
|------|------|
| `app/(teacher)/teacher/` | 教师模式页面与路由 |
| `app/api/teacher/` | 教师模式 API |
| `app/join/` | 学生参与入口 |
| `components/teacher/` | 教师模式 UI 组件 |
| `lib/teacher/` | 教师业务服务、类型与适配层 |
| `configs/feature-flags.ts` | 教师扩展开关默认值与环境变量映射 |

## 适配层

`lib/teacher/adapters/` 是教师扩展与原项目能力交互的主要边界：

- `lesson-adapter.ts`：教案与原有内容结构转换。
- `slide-adapter.ts`：教师课件与原有幻灯片/场景结构转换。
- `quiz-adapter.ts`：测验题目与评分数据转换。
- `pbl-adapter.ts`：项目式学习结构转换。
- `export-adapter.ts`：PPTX 导出数据转换。

官方更新导致原项目类型或接口变化时，优先更新适配层，并补充 `tests/teacher/adapters.test.ts`。

## Feature Flag

教师扩展相关能力由 `configs/feature-flags.ts` 统一声明：

- 教师业务功能：教案、课件、Quiz、PBL、实时答题、在线评分、课堂反馈、PPTX 导出。
- 禁用/弱化功能：互动白板、语音讲解、语音播放、跟随演示、复杂实时播放控制。

客户端通过 `useFeatureFlag` 或 `getPublicFeatureFlag` 判断，服务端通过 `getFeatureFlag` 判断。
位于 `Stage`、`CanvasToolbar`、`PlaybackEngine` 等原课堂复用组件中的禁用/弱化逻辑，必须额外结合教师模式上下文判断；普通 `/classroom/...` 页面应保持 OpenMAIC 原有功能。

## 原项目最小改动

允许少量改动原项目入口或运行时保护代码，例如：

- 首页教师入口展示。
- `Stage`、`CanvasToolbar`、`PlaybackEngine` 中对禁用功能的保护。
- 原有 API 中对教师扩展禁用项的安全返回。

这些改动应保持小而明确，并在对应 `plan/dev-tasks/` 文档中记录实现边界。

## 复杂播放控制弱化

教师模式上下文中 `complexRealtimePlayback=false` 时：

- 隐藏讲解播放/暂停入口、播放速度控制和自动播放控制。
- 保留上一页、下一页、页码、侧栏/对话区收起和可用的全屏入口。
- 强制自动播放关闭，播放速度回到 `1x`。
- `PlaybackEngine` 的阅读计时按 `1x` 处理，避免本地旧设置影响教师扩展模式。

教师课件预览统一使用 `/classroom/teacher/[id]` 下的 `TeacherClassroomStage`，提供缩略图导航、基础翻页、教师讲解稿面板和全屏播放，不接入原项目复杂实时播放控制。
普通 `/classroom/...` 渲染页不套用该禁用项，继续保留原有播放/暂停、倍速、自动播放、全屏和音频播放能力。

## 维护检查

同步官方更新前后运行：

```bash
scripts/check-upstream-compat.sh
pnpm exec tsc --noEmit
pnpm exec vitest run tests/feature-flags.test.ts tests/feature-gate.test.ts tests/teacher/adapters.test.ts tests/teacher/services.test.ts
```
