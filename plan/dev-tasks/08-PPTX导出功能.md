# 功能点 08：PPTX 导出功能

| 属性 | 值 |
|------|----|
| 状态 | 待开发 |
| 优先级 | P0 |
| 阶段 | 第一阶段：核心备课流程 |
| 前置依赖 | 06-课件Slide生成功能、07-课件预览与编辑 |
| 预估工时 | 3-5天 |

---

## 一、功能概述

保留并接入 OpenMAIC 原有的 PPTX 导出能力，使教师可以将生成和编辑后的课件导出为 .pptx 文件，用于实际课堂教学、二次编辑或教研归档。

### 核心目标

1. 保留原有 PPTX 导出逻辑
2. 在教师模式中提供便捷的导出入口
3. 支持导出整套课件或选择性导出部分 Slide
4. 导出文件保持良好的格式和可编辑性

---

## 二、现有代码分析

### 现有导出能力

| 文件/目录 | 说明 |
|-----------|------|
| `app/api/export/` | 导出 API 入口 |
| `lib/export/` | 导出逻辑核心（可能存在） |
| `packages/` | 可能包含 PPTX 生成库或工具 |

OpenMAIC 原有项目已经具备 PPTX 导出能力，教师扩展模块需要通过适配层调用该能力。

---

## 三、详细实现内容

### 3.1 导出服务

**实现文件**：`lib/teacher/export-service.ts`

核心功能：
1. 接收导出请求（课件 ID、导出范围）
2. 通过 ExportAdapter 调用原有 PPTX 导出能力
3. 返回生成的 PPTX 文件

### 3.2 导出页面

**实现文件**：`app/(teacher)/teacher/lesson/[id]/export/page.tsx`

页面功能：
- 导出配置（全部导出 / 选择性导出）
- 导出格式选择（当前仅 PPTX，预留 PDF 等）
- 预览导出效果
- 导出按钮与下载

### 3.3 导出配置组件

**新增文件**：`components/teacher/export-panel.tsx`

配置面板：
- Slide 勾选列表（支持全选/反选）
- 导出格式选择
- 文件名自定义
- 导出历史记录

### 3.4 快捷导出入口

在以下位置添加快捷导出按钮：
- 课件预览页工具栏
- 教案详情页操作区
- 教案列表的更多操作菜单

---

## 四、需要新增的文件

| 文件路径 | 说明 |
|---------|------|
| `lib/teacher/export-service.ts` | 导出服务 |
| `app/(teacher)/teacher/lesson/[id]/export/page.tsx` | 导出页面（完整实现） |
| `components/teacher/export-panel.tsx` | 导出配置面板 |
| `app/api/teacher/export/route.ts` | 导出 API（完善实现） |

---

## 五、需要修改的文件

| 文件路径 | 修改内容 |
|---------|----------|
| `lib/teacher/adapters/export-adapter.ts` | 完善导出适配器 |
| `app/(teacher)/teacher/lesson/[id]/slides/page.tsx` | 添加快捷导出按钮 |

---

## 六、接口设计

### 导出课件

```
POST /api/teacher/export
Body: {
  lessonId: string;
  format: 'pptx' | 'pdf';
  slideIds?: string[];       // 不传则导出全部
  fileName?: string;
}
Response: Binary file (application/vnd.openxmlformats-officedocument.presentationml.presentation)
```

---

## 七、验证方案

1. 可正常导出完整课件为 PPTX 文件
2. 导出的 PPTX 可在 Microsoft PowerPoint / WPS 中正常打开
3. 导出的 PPTX 内容与预览一致
4. 选择性导出功能正常工作
5. 大文件导出不超时

---

## 八、风险与注意事项

1. **导出格式兼容**：需要确认教师模式的 Slide 数据可以正确传递给原有导出逻辑
2. **文件大小**：包含大量图片的课件导出文件可能较大
3. **超时控制**：导出过程可能较慢，需要异步处理或进度提示
4. **字体嵌入**：PPTX 中的字体在不同系统上可能不一致
