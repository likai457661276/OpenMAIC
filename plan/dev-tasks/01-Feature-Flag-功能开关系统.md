# 功能点 01：Feature Flag 功能开关系统

| 属性 | 值 |
|------|----|
| 状态 | 已验证 |
| 优先级 | P0 |
| 阶段 | 第零阶段：基础设施搭建 |
| 前置依赖 | 无 |
| 预估工时 | 2-3天 |

---

## 一、功能概述

设计并实现一个统一的功能开关（Feature Flag）系统，用于控制 OpenMAIC 各功能模块的启用/禁用状态。该系统是整个教师扩展模块改造的基础，所有功能的启用与禁用都通过此系统管控。

### 核心目标

1. 提供一个集中化的功能开关配置，支持前端和后端共用
2. 支持运行时读取和编译时常量两种模式
3. 支持按环境（development/staging/production）配置不同策略
4. 对原项目代码侵入最小化

---

## 二、现有代码分析

### 现有配置体系

项目当前使用以下配置方式：
- **环境变量配置**：`.env.example` 和 `.env.local` 管理环境变量
- **Provider 配置**：`configs/` 目录管理 AI 提供商配置
  - `configs/provider-config.ts` — 服务端提供商配置
  - `configs/client-provider-config.ts` — 客户端提供商配置
- **Next.js 配置**：`next.config.ts` 管理框架配置
- 当前项目**没有统一的 Feature Flag 系统**

### 涉及的关键文件

| 文件路径 | 说明 |
|---------|------|
| `.env.example` | 环境变量模板 |
| `configs/provider-config.ts` | 服务端配置入口 |
| `configs/client-provider-config.ts` | 客户端配置入口 |
| `next.config.ts` | Next.js 配置 |
| `lib/env.ts` | 环境变量工具 |

---

## 三、详细实现内容

### 3.1 功能开关配置文件

**新增文件**：`configs/feature-flags.ts`

功能开关定义：

```typescript
// 功能开关类型定义
export interface FeatureFlags {
  // 教师扩展模块总开关
  teacherExtension: boolean;

  // === 保留能力 ===
  lessonGeneration: boolean;      // 教案生成
  slideGeneration: boolean;       // 课件生成
  richCourseware: boolean;        // 丰富课件内容
  quizGeneration: boolean;        // Quiz 测验生成
  pblGeneration: boolean;         // PBL 项目式学习
  realtimeAnswer: boolean;        // 实时答题
  onlineScoring: boolean;         // 在线评分
  classroomFeedback: boolean;     // 课堂互动反馈
  pptxExport: boolean;            // PPTX 导出

  // === 禁用能力 ===
  whiteboard: boolean;            // 互动白板
  voiceNarration: boolean;        // 语音讲解
  voicePlayback: boolean;         // 语音播放
  followPresenter: boolean;       // 跟随演示
  complexRealtimePlayback: boolean; // 复杂实时播放控制
}
```

默认配置（教师扩展模式）：

```typescript
export const DEFAULT_TEACHER_MODE_FLAGS: FeatureFlags = {
  teacherExtension: true,
  lessonGeneration: true,
  slideGeneration: true,
  richCourseware: true,
  quizGeneration: true,
  pblGeneration: true,
  realtimeAnswer: true,
  onlineScoring: true,
  classroomFeedback: true,
  pptxExport: true,
  whiteboard: false,
  voiceNarration: false,
  voicePlayback: false,
  followPresenter: false,
  complexRealtimePlayback: false,
};
```

### 3.2 环境变量支持

在 `.env.example` 中新增 Feature Flag 相关变量：

```env
# Feature Flags - Teacher Extension Mode
FEATURE_TEACHER_EXTENSION=true
FEATURE_WHITEBOARD=false
FEATURE_VOICE_NARRATION=false
FEATURE_VOICE_PLAYBACK=false
FEATURE_FOLLOW_PRESENTER=false
FEATURE_COMPLEX_REALTIME_PLAYBACK=false
```

### 3.3 Feature Flag 读取工具

**新增文件**：`lib/feature-flags.ts`

提供统一的 Feature Flag 读取 API：

```typescript
// 服务端读取（支持环境变量覆盖）
export function getFeatureFlag(flag: keyof FeatureFlags): boolean;

// 客户端读取（通过 Next.js public env 或 API）
export function useFeatureFlag(flag: keyof FeatureFlags): boolean;

// 批量读取
export function getFeatureFlags(): FeatureFlags;
```

### 3.4 React Hook 封装

**新增文件**：`lib/hooks/use-feature-flag.ts`

提供 React 组件中使用的 Hook：

```typescript
export function useFeatureFlag(flag: keyof FeatureFlags): boolean;
export function useFeatureFlags(): FeatureFlags;
```

### 3.5 条件渲染组件

**新增文件**：`components/feature-gate.tsx`

提供声明式的功能门控组件：

```typescript
export function FeatureGate({
  feature,
  children,
  fallback
}: {
  feature: keyof FeatureFlags;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}): React.ReactNode;
```

---

## 四、需要新增的文件

| 文件路径 | 说明 |
|---------|------|
| `configs/feature-flags.ts` | Feature Flag 配置定义与默认值 |
| `lib/feature-flags.ts` | Feature Flag 读取工具（服务端+客户端） |
| `lib/hooks/use-feature-flag.ts` | React Hook 封装 |
| `components/feature-gate.tsx` | 条件渲染门控组件 |

---

## 五、需要修改的文件

| 文件路径 | 修改内容 |
|---------|----------|
| `.env.example` | 新增 Feature Flag 相关环境变量 |
| `next.config.ts` | 将公共 Feature Flag 注入 `publicRuntimeConfig` 或 `NEXT_PUBLIC_` 前缀变量 |

---

## 六、接口设计

### 服务端 API（可选）

如果未来需要动态调整 Feature Flag，可以预留 API 端点：

```
GET /api/feature-flags — 获取当前 Feature Flag 配置
PUT /api/feature-flags — 更新 Feature Flag 配置（需鉴权）
```

当前阶段建议使用静态配置 + 环境变量覆盖方式，暂不实现动态 API。

---

## 七、验证方案

1. **单元测试**：验证 Feature Flag 读取逻辑、环境变量覆盖逻辑
2. **组件测试**：验证 `FeatureGate` 组件的条件渲染行为
3. **集成测试**：验证在不同 Feature Flag 组合下，页面模块的正确显示/隐藏

---

## 八、风险与注意事项

1. **环境变量命名规范**：Feature Flag 变量统一使用 `FEATURE_` 前缀，避免与现有变量冲突
2. **客户端暴露**：需要注意哪些 Flag 可以暴露给客户端（使用 `NEXT_PUBLIC_` 前缀）
3. **性能影响**：Feature Flag 读取应做到零开销或接近零开销，避免每次渲染重复计算
4. **与原项目隔离**：Feature Flag 系统本身不改动原有业务逻辑，只在新增入口处使用
