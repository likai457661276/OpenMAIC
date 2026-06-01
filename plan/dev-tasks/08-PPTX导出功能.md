# 功能点 08：PPTX 导出功能

| 属性 | 值 |
|------|----|
| 状态 | 已实现 |
| 优先级 | P0 |
| 阶段 | 第一阶段：核心备课流程 |
| 前置依赖 | 06-课件Slide生成功能、07-课件预览与编辑 |
| 预估工时 | 3-5天 |

---

## 一、功能概述

保留并接入 OpenMAIC 原有的 PPTX 导出能力，使教师可以将生成和编辑后的课件导出为 .pptx 文件，用于实际课堂教学、二次编辑或教研归档。

### 核心目标

1. 保留原有 PPTX 导出依赖与生成能力
2. 在教师模式中提供便捷的导出入口
3. 支持导出整套课件或选择性导出部分 Slide
4. 导出文件保持良好的格式和可编辑性

---

## 二、现有代码分析

### 现有导出能力

| 文件/目录 | 说明 |
|-----------|------|
| `lib/export/use-export-pptx.ts` | 原主工作台导出 Hook，使用 `pptxgenjs` 将 Slide 元素转换为 PPTX |
| `packages/pptxgenjs/` | 项目内置 PPTX 生成库 |
| `lib/types/slides.ts` | 原 Slide 数据结构，教师课件继续复用该结构 |

OpenMAIC 原有项目已经具备 PPTX 导出能力。教师扩展模块当前在服务端复用同一 `pptxgenjs` 依赖和 Slide 数据结构，为教师课件提供二进制下载 API；主工作台 Hook 仍保持不变。

---

## 三、详细实现内容

### 3.1 导出服务

**实现文件**：`lib/teacher/export-service.ts`

核心功能：
1. 接收导出请求（课件 ID、导出范围）
2. 读取教师教案与已保存课件；如课件不存在，则基于教案自动创建默认课件
3. 基于 `pptxgenjs` 将教师 Slide 数据生成 PPTX Buffer
4. 返回生成的 PPTX 文件、文件名、MIME 类型、导出页数

当前实现说明：
- 支持 `format: 'pptx'`
- `format: 'pdf'` 为预留项，前端置灰
- 支持 `slideIds` 选择性导出；不传则导出全部
- 导出内容来自当前已保存课件

### 3.2 导出页面

**实现文件**：`app/(teacher)/teacher/lesson/[id]/export/page.tsx`

页面功能：
- 导出配置（全部导出 / 选择性导出）
- 导出格式选择（当前仅 PPTX，预留 PDF）
- Slide 勾选列表作为导出内容预览
- 导出按钮与下载

### 3.3 导出配置组件

**新增文件**：`components/teacher/export-panel.tsx`

配置面板：
- Slide 勾选列表（支持全选/反选）
- 导出格式选择（PDF 预留置灰）
- 文件名自定义
- 下载生成的 PPTX 文件

导出历史记录尚未落地；当前版本优先完成核心备课闭环，历史记录留给后续持久化能力。

### 3.4 快捷导出入口

在以下位置添加快捷导出按钮：
- 课件预览页工具栏
- 教案详情页操作区
- 教案详情页已存在「导出」入口

当前教师历史页仍为占位页，尚无教案列表更多操作菜单；该入口会在历史列表功能实现后补齐。

---

## 四、需要新增的文件

| 文件路径 | 说明 |
|---------|------|
| `lib/teacher/export-service.ts` | 导出服务 |
| `app/(teacher)/teacher/lesson/[id]/export/page.tsx` | 导出页面（完整实现） |
| `components/teacher/export-panel.tsx` | 导出配置面板 |
| `app/api/teacher/export/route.ts` | 导出 API（二进制 PPTX 响应） |

---

## 五、需要修改的文件

| 文件路径 | 修改内容 |
|---------|----------|
| `lib/teacher/adapters/export-adapter.ts` | 完善导出适配器 |
| `app/(teacher)/teacher/lesson/[id]/slides/page.tsx` | 添加快捷导出按钮 |
| `components/teacher/slide-toolbar.tsx` | 添加课件工具栏导出入口 |
| `lib/teacher/adapters/types.ts` | 扩展导出输入字段 |

---

## 六、接口设计

### 导出课件

```
POST /api/teacher/export
Body: {
  lessonId: string;
  format: 'pptx' | 'pdf';   // 当前仅支持 pptx，pdf 预留
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

已补充自动化验证：
- `tests/teacher/services.test.ts` 覆盖选择性导出，并校验生成结果为 PPTX ZIP 文件头

---

## 八、风险与注意事项

1. **导出格式兼容**：需要确认教师模式的 Slide 数据可以正确传递给原有导出逻辑
2. **文件大小**：包含大量图片的课件导出文件可能较大
3. **超时控制**：导出过程可能较慢，需要异步处理或进度提示
4. **字体嵌入**：PPTX 中的字体在不同系统上可能不一致
5. **复杂元素边界**：当前教师生成的主要内容为文本与基础背景；服务端导出优先保证这些核心内容可编辑。复杂图片、音视频、特殊 SVG 形状的高保真导出后续可继续与主工作台导出 Hook 对齐。
