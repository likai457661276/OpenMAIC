# 功能点 09：Quiz 测验生成功能

| 属性 | 值 |
|------|----|
| 状态 | 待开发 |
| 优先级 | P1 |
| 阶段 | 第二阶段：课堂互动能力 |
| 前置依赖 | 05-教案生成功能、03-Provider适配层 |
| 预估工时 | 5-7天 |

---

## 一、功能概述

在教师扩展模式下，保留并接入 OpenMAIC 原有的 Quiz 测验生成能力。教师可以基于已生成的教案内容，自动或手动创建课堂测验题目，包括选择题、判断题、填空题、简答题等。

### 核心目标

1. 基于教案内容自动生成测验题目
2. 支持多种题型（选择题、判断题、填空题、简答题）
3. 支持教师手动编辑和补充题目
4. 支持题目的答案设置和解析
5. 为后续的实时答题和在线评分提供数据基础

---

## 二、现有代码分析

### 现有 Quiz 能力

OpenMAIC 原有项目已具备 Quiz 生成和管理能力：

| 文件/目录 | 说明 |
|-----------|------|
| `app/api/quiz/` | Quiz 相关 API |
| `components/quiz/` | Quiz 展示和交互组件 |
| `lib/generation/` | 生成逻辑中包含 Quiz 生成部分 |
| `components/slides/` | Slide 中可能嵌入 Quiz 内容 |

### 现有 Quiz 数据结构

原有 Quiz 可能支持的题型：
- 单选题 (Single Choice)
- 多选题 (Multiple Choice)
- 判断题 (True/False)
- 填空题 (Fill in Blanks)
- 简答题 (Short Answer)

---

## 三、详细实现内容

### 3.1 Quiz 数据模型

**新增文件**：`lib/teacher/types/quiz.ts`

```typescript
export interface QuizSet {
  id: string;
  lessonId: string;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  totalScore: number;
  timeLimit?: number;          // 总时限（分钟）
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'ready' | 'active' | 'completed';
}

export interface QuizQuestion {
  id: string;
  order: number;
  type: QuestionType;
  content: string;              // 题目内容
  options?: QuizOption[];       // 选项（选择题/判断题）
  correctAnswer: string | string[];
  explanation: string;          // 答案解析
  score: number;                // 分值
  difficulty: 'easy' | 'medium' | 'hard';
  knowledgePoint?: string;      // 关联知识点
}

export type QuestionType =
  | 'single-choice'
  | 'multiple-choice'
  | 'true-false'
  | 'fill-blank'
  | 'short-answer';

export interface QuizOption {
  id: string;
  label: string;                // A/B/C/D
  content: string;
  isCorrect: boolean;
}

export interface QuizGenerationInput {
  lessonId: string;
  lessonPlan: LessonPlan;
  questionCount?: number;
  questionTypes?: QuestionType[];
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
}
```

### 3.2 Quiz 生成服务

**实现文件**：`lib/teacher/quiz-service.ts`

核心功能：
1. 接收 Quiz 生成请求
2. 通过 QuizAdapter 调用原有 Quiz 生成能力
3. 解析 AI 生成的题目为结构化数据
4. 保存 Quiz 数据
5. 支持单题再生成

### 3.3 Quiz 管理页面

**实现文件**：`app/(teacher)/lesson/[id]/quiz/page.tsx`

页面功能：
- Quiz 生成配置（题目数量、题型分布、难度等）
- 生成中的进度展示
- 题目列表展示
- 单题编辑功能
- 题目排序/增删
- 答案和解析设置
- 预览测验效果
- 发布/激活测验

### 3.4 Quiz 编辑组件

**新增文件**：`components/teacher/quiz-editor.tsx`

题目编辑组件，支持：
- 题目内容编辑
- 选项增删改
- 正确答案标记
- 解析编辑
- 分值设置
- 难度标记

### 3.5 Quiz 预览组件

**新增文件**：`components/teacher/quiz-preview.tsx`

测验预览组件，模拟学生视角：
- 按题目顺序展示
- 支持答题操作
- 显示计时器
- 提交后显示批改结果

---

## 四、需要新增的文件

| 文件路径 | 说明 |
|---------|------|
| `lib/teacher/types/quiz.ts` | Quiz 数据类型定义 |
| `lib/teacher/quiz-service.ts` | Quiz 生成与管理服务 |
| `app/(teacher)/lesson/[id]/quiz/page.tsx` | Quiz 管理页面（完整实现） |
| `components/teacher/quiz-editor.tsx` | 题目编辑组件 |
| `components/teacher/quiz-preview.tsx` | 测验预览组件 |
| `components/teacher/quiz-question-card.tsx` | 单题展示卡片 |
| `components/teacher/quiz-config-dialog.tsx` | Quiz 生成配置弹窗 |
| `app/api/teacher/generate-quiz/route.ts` | Quiz 生成 API（完善） |
| `app/api/teacher/quiz/route.ts` | Quiz CRUD API |
| `app/api/teacher/quiz/[id]/route.ts` | 单个 Quiz 操作 API |

---

## 五、需要修改的文件

| 文件路径 | 修改内容 |
|---------|----------|
| `lib/teacher/adapters/quiz-adapter.ts` | 完善 Quiz 生成适配器 |
| `app/(teacher)/lesson/[id]/page.tsx` | 添加「生成 Quiz」入口 |

---

## 六、接口设计

### 生成 Quiz

```
POST /api/teacher/generate-quiz
Body: QuizGenerationInput
Response: { quizSet: QuizSet; }
```

### 获取 Quiz

```
GET /api/teacher/quiz/:id
Response: { quizSet: QuizSet; }
```

### 更新题目

```
PUT /api/teacher/quiz/:id/questions/:questionId
Body: Partial<QuizQuestion>
Response: { question: QuizQuestion; }
```

### 发布/激活 Quiz

```
POST /api/teacher/quiz/:id/activate
Response: { quizSet: QuizSet; sessionCode: string; }
```

---

## 七、验证方案

1. 可基于教案正常生成 Quiz 题目
2. 各题型正确展示和编辑
3. 题目增删改功能正常
4. 答案和解析设置正确
5. 预览模式可模拟答题流程
6. Quiz 发布功能正常

---

## 八、风险与注意事项

1. **题目质量**：AI 生成的题目质量需要验证，特别是答案的正确性
2. **题型适配**：原有 Quiz 系统可能支持的题型与教师模式需求不完全一致
3. **公式渲染**：数学/物理等学科的题目可能包含公式，需要 LaTeX 渲染支持
4. **与实时答题衔接**：Quiz 数据结构需要兼容后续的实时答题功能
