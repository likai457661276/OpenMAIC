# 功能点 10：PBL 项目式学习功能

| 属性 | 值 |
|------|----|
| 状态 | 待开发 |
| 优先级 | P1 |
| 阶段 | 第二阶段：课堂互动能力 |
| 前置依赖 | 05-教案生成功能、03-Provider适配层 |
| 预估工时 | 5-7天 |

---

## 一、功能概述

保留并接入 OpenMAIC 原有的 PBL（Project-Based Learning，项目式学习）生成能力。教师可以基于教案内容，生成结构化的 PBL 项目，包含项目主题、任务设计、实施步骤、评价标准等。

### 核心目标

1. 基于教案内容自动生成 PBL 项目方案
2. 支持项目主题、任务、步骤、评价标准等结构化内容
3. 支持教师编辑和定制化 PBL 内容
4. 提供 PBL 项目管理界面

---

## 二、现有代码分析

### 现有 PBL 能力

| 文件/目录 | 说明 |
|-----------|------|
| `lib/generation/` | 生成逻辑中可能包含 PBL 内容生成 |
| `components/` | 可能存在 PBL 相关展示组件 |
| `app/api/` | PBL 相关 API |

---

## 三、详细实现内容

### 3.1 PBL 数据模型

**新增文件**：`lib/teacher/types/pbl.ts`

```typescript
export interface PBLProject {
  id: string;
  lessonId: string;
  title: string;                    // 项目主题
  background: string;               // 项目背景
  drivingQuestion: string;          // 驱动性问题
  objectives: string[];             // 项目目标
  tasks: PBLTask[];                 // 项目任务
  timeline: PBLPhase[];             // 实施阶段
  teacherGuidance: string;          // 教师指导建议
  studentDeliverables: string[];    // 学生成果要求
  evaluationCriteria: EvaluationRubric; // 评价标准
  resources: string[];              // 推荐资源
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'ready' | 'active' | 'completed';
}

export interface PBLTask {
  id: string;
  order: number;
  title: string;
  description: string;
  type: 'individual' | 'group';
  duration: string;
  expectedOutcome: string;
}

export interface PBLPhase {
  id: string;
  order: number;
  name: string;                     // 阶段名称
  duration: string;                 // 持续时间
  activities: string[];             // 活动列表
  milestones: string[];             // 里程碑
}

export interface EvaluationRubric {
  dimensions: RubricDimension[];
  totalScore: number;
}

export interface RubricDimension {
  name: string;                     // 评价维度
  weight: number;                   // 权重
  levels: RubricLevel[];            // 等级描述
}

export interface RubricLevel {
  level: string;                    // 优秀/良好/合格/待改进
  score: number;
  description: string;
}
```

### 3.2 PBL 生成服务

**实现文件**：`lib/teacher/pbl-service.ts`

核心功能：
1. 接收 PBL 生成请求
2. 通过 PBLAdapter 调用原有 PBL 生成能力
3. 解析 AI 生成结果为结构化 PBL 项目
4. 保存 PBL 数据

### 3.3 PBL 管理页面

**实现文件**：`app/(teacher)/lesson/[id]/pbl/page.tsx`

页面功能：
- PBL 项目概览
- 任务列表管理
- 实施阶段时间轴
- 评价标准编辑
- 资源推荐展示
- 教师指导编辑

### 3.4 PBL 展示组件

**新增组件**：
- `components/teacher/pbl-overview.tsx` — PBL 项目概览卡片
- `components/teacher/pbl-task-list.tsx` — 任务列表组件
- `components/teacher/pbl-timeline.tsx` — 实施阶段时间轴
- `components/teacher/pbl-rubric-editor.tsx` — 评价标准编辑器

---

## 四、需要新增的文件

| 文件路径 | 说明 |
|---------|------|
| `lib/teacher/types/pbl.ts` | PBL 数据类型定义 |
| `lib/teacher/pbl-service.ts` | PBL 生成与管理服务 |
| `app/(teacher)/lesson/[id]/pbl/page.tsx` | PBL 管理页面（完整实现） |
| `components/teacher/pbl-overview.tsx` | PBL 概览组件 |
| `components/teacher/pbl-task-list.tsx` | 任务列表组件 |
| `components/teacher/pbl-timeline.tsx` | 实施阶段时间轴 |
| `components/teacher/pbl-rubric-editor.tsx` | 评价标准编辑器 |
| `app/api/teacher/generate-pbl/route.ts` | PBL 生成 API（完善） |
| `app/api/teacher/pbl/route.ts` | PBL CRUD API |

---

## 五、需要修改的文件

| 文件路径 | 修改内容 |
|---------|----------|
| `lib/teacher/adapters/pbl-adapter.ts` | 完善 PBL 生成适配器 |
| `app/(teacher)/lesson/[id]/page.tsx` | 添加「生成 PBL」入口 |

---

## 六、接口设计

### 生成 PBL

```
POST /api/teacher/generate-pbl
Body: { lessonId: string; style?: string; }
Response: { project: PBLProject; }
```

### 获取 PBL

```
GET /api/teacher/pbl/:id
Response: { project: PBLProject; }
```

### 更新 PBL

```
PUT /api/teacher/pbl/:id
Body: Partial<PBLProject>
Response: { project: PBLProject; }
```

---

## 七、验证方案

1. 可基于教案正常生成 PBL 项目
2. PBL 各部分内容结构完整
3. 编辑功能正常
4. 评价标准编辑器正常工作
5. 时间轴组件正确展示

---

## 八、风险与注意事项

1. **PBL 内容质量**：PBL 项目需要高质量的任务设计，依赖 Prompt 质量
2. **学科差异**：不同学科的 PBL 项目形式差异较大
3. **评价标准**：评价标准需要与实际教学评价体系对齐
4. **与课件衔接**：PBL 项目内容可能需要嵌入课件中展示
