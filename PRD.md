# PDF Editor — 产品需求文档 (PRD)

> **版本**: v3.0（经专家评审修订）
> **日期**: 2026-03-06
> **技术栈**: React 18 + TypeScript 5 + Tailwind CSS 3 + Vite 5

---

## 一、产品概述

PDF Editor 是一款纯前端的 PDF 编辑器 Web 应用。用户可以直接选中 PDF 中的原文文本进行修改，编辑后文本会按照原始字体、字号、字重自动重排（reflow）。

同时支持加密 PDF 解锁、图片编辑、新增内容叠加、注释标注等能力。所有操作在浏览器端完成，不依赖后端服务。

### 核心价值

- **真编辑** — 直接修改 PDF 原文文本，保持原始排版属性，支持自动重排
- **隐私优先** — 文件不上传至任何服务器，全部在浏览器本地处理
- **零安装** — 打开网页即用，无需安装任何软件

### 诚实的能力边界（Honest Scope）

本产品不等同于 Adobe Acrobat。以下是 v1.0 的已知限制，用户应知悉：

- **导出方式**: 编辑后的文本通过"覆盖原区域 + 重新绘制"方式写入 PDF，而非精确修改原始内容流。这意味着导出 PDF 的文件体积可能略有增加，且被覆盖区域的原始文本不可被搜索/复制。
- **字体**: 当用户输入原始字体中不存在的字符（如原文是英文字体子集，用户输入中文），将自动使用替代字体，UI 会提示用户。
- **渲染精度**: Canvas 渲染可能存在 ±1-2px 的 subpixel 偏差。
- **字体格式**: v1.0 仅支持 TrueType / OpenType 嵌入字体。Type1、CIDFont 格式的 PDF 将提示用户"部分字体不可编辑"。

---

## 二、目标用户

| 用户角色 | 典型场景 |
|---------|---------|
| 普通办公用户 | 修改 PDF 合同中的某个条款文字、更正报价单上的数字 |
| 学生 / 研究人员 | 在 PDF 论文上修正错别字、添加批注和高亮 |
| 文档处理人员 | 解锁受保护的 PDF 后编辑内容，重新导出 |

---

## 三、功能需求

### 3.1 PDF 文件导入

| 功能项 | 描述 | 优先级 |
|-------|------|--------|
| 文件上传 | 支持点击上传和拖拽上传 PDF 文件 | P0 |
| 加密 PDF 解锁 | 用户输入密码后解锁受保护的 PDF | P1 *(从 P0 降级，MVP 优先文本编辑)* |
| 文件信息展示 | 上传后展示文件名、页数、文件大小等基本信息 | P1 |

### 3.2 PDF 查看

| 功能项 | 描述 | 优先级 |
|-------|------|--------|
| 页面渲染 | 基于文档模型高保真渲染 PDF 页面内容 | P0 |
| 页面缩放 | 支持放大、缩小、适应宽度、适应页面 | P0 |
| 页面导航 | 页码跳转、上一页/下一页、键盘快捷键 | P0 |
| 页面缩略图 | 左侧面板展示所有页面缩略图，点击跳转 | P2 *(从 P1 降级)* |
| 多页滚动 | 支持连续滚动浏览所有页面 | P1 |

### 3.3 PDF 原文编辑（核心特性）

| 功能项 | 描述 | 优先级 |
|-------|------|--------|
| 文本选中 | 点击或框选 PDF 中的原文文本块，高亮显示可编辑区域 | P0 |
| 原文文本修改 | 双击文本块进入编辑模式，直接修改文字内容 | P0 |
| 字体保真 | 编辑后的文本保持原始字体、字号、字重、颜色等属性 | P0 |
| 文本重排 | 修改文字后，同一文本块内的内容自动重新排版换行 | P0 |
| **文本块溢出处理** | 编辑导致文本超出边界时的自动处理策略（见 3.3.1） | P0 |
| 文本属性调整 | 选中文本后可修改字体、字号、颜色、粗体/斜体等 | P1 |
| 段落属性 | 支持对齐方式（左/中/右/两端对齐）、行距调整 | P1 |

#### 3.3.1 文本块溢出处理策略

当用户编辑文本导致内容超出原始 bounding box 时，系统按以下优先级自动处理：

```
第一层：容错空间
  ├── 允许文本块在垂直方向溢出 15% 的高度
  └── 若溢出 ≤ 15%，静默接受，不做任何干预

第二层：自动收缩（溢出 > 15% 时触发）
  ├── 优先级 1: 缩小行距（lineSpacing 从 1.2 → 1.0）
  ├── 优先级 2: 缩小字间距（letterSpacing 减少 5%）
  └── 优先级 3: 缩小字号（fontSize 减少 1pt，最多减少 3pt）

第三层：UI 反馈
  ├── 文本块边框变为橙色警告色
  ├── 属性面板显示"内容超出边界"警告
  └── 提供"恢复原始排版"一键还原按钮

第四层：导出验证
  ├── 导出前扫描所有文本块的溢出状态
  └── 溢出时弹窗提示，用户确认后方可导出
```

### 3.4 新增内容编辑

| 功能项 | 描述 | 优先级 |
|-------|------|--------|
| 新增文本框 | 在页面任意位置添加新的文本框 | P0 |
| 图片插入 | 上传图片并放置到 PDF 页面上，支持缩放和拖拽定位 | P1 *(从 P0 降级)* |
| 自由绘图 | 画笔工具，支持颜色和粗细设置 | P2 |
| 形状工具 | 矩形、圆形、箭头、直线等基本形状 | P2 |
| 元素操作 | 选中元素后支持移动、缩放、旋转、删除 | P0 |
| 撤销/重做 | 支持所有编辑操作的撤销与重做 (Ctrl+Z / Ctrl+Shift+Z) | P0 |

### 3.5 PDF 注释

| 功能项 | 描述 | 优先级 |
|-------|------|--------|
| 文本高亮 | 选中 PDF 原文文本进行高亮标注，支持多种颜色 | P2 *(从 P1 降级)* |
| 便签注释 | 在页面上添加便签式注释 | P2 |
| 下划线/删除线 | 对选中文本添加下划线或删除线 | P2 |

### 3.6 PDF 导出与保存

| 功能项 | 描述 | 优先级 |
|-------|------|--------|
| 保存为 PDF | 将编辑后的文档模型序列化为 PDF 文件 | P0 |
| 文件命名 | 导出时支持自定义文件名（默认在原文件名后加 `_edited`） | P0 |
| 矢量质量保持 | 编辑后的文本以矢量字体写入（非光栅化） | P0 |
| **导出前验证** | 检查溢出/缺字等问题，弹窗告知用户再确认导出 | P0 |

---

## 四、技术架构

### 4.1 架构总览 — 基于文档模型（Document Model）的编辑方案

核心思想：**将 PDF 解析为结构化的中间文档模型，在模型上进行编辑，再将模型序列化回 PDF**。

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐
│             │     │   PDF Parser     │     │  Document Model  │
│ 用户上传 PDF │────▶│   Module         │────▶│  (结构化中间表示)  │
│ (可能加密)   │     │                  │     │                  │
└─────────────┘     │ · 内容流解析      │     │ · Pages[]        │
                    │ · 字体提取        │     │ · TextBlocks[]   │
                    │ · 图片提取        │     │ · Images[]       │
                    │ · 密码解密        │     │ · Paths[]        │
                    └──────────────────┘     └────────┬─────────┘
                                                      │
                              ┌────────────────────────┼────────────────────────┐
                              ▼                        ▼                        ▼
                     ┌──────────────┐         ┌──────────────┐        ┌──────────────┐
                     │  Layout      │         │  Edit        │        │  Render      │
                     │  Engine      │         │  Engine      │        │  Engine      │
                     │              │         │              │        │              │
                     │ 文本重排      │◀───────▶│ 用户编辑      │───────▶│ 文档模型      │
                     │ 字体度量      │         │ → 模型更新    │        │ → Canvas     │
                     │ 断行算法      │         │              │        │ 渲染         │
                     └──────────────┘         └──────────────┘        └──────────────┘
                              │                        │                        │
                              └────────────────────────┼────────────────────────┘
                                                       ▼
                                    ┌──────────────────────────────────┐
                                    │       基础设施层                   │
                                    │  Font Manager | Coordinate       │
                                    │  Transformer  | Event Bus        │
                                    └──────────────────┬───────────────┘
                                                       ▼
                                              ┌──────────────────┐
                                              │  Export Module   │
                                              │  覆盖 + 重绘策略  │
                                              │  → 新 PDF 文件    │
                                              └──────────────────┘
```

### 4.2 七大核心模块

整个编辑器按职责拆分为 **七个** 可独立开发的模块（在原六大模块基础上新增 Coordinate Transformer）。

---

#### 模块 1: PDF Parser — PDF 解析器

**职责**: 将 PDF 二进制文件解析为结构化的文档模型。

**负责人画像**: 熟悉 PDF 规范（ISO 32000）和 pdf.js 内部实现的工程师。

**技术方案**:
- 使用 `pdfjs-dist` 解析 PDF 文件结构
- 通过 `page.getTextContent()` 提取文本内容及其样式属性（字体名、字号、变换矩阵、颜色）
- 通过 `page.getOperatorList()` 解析内容流操作符，提取非文本元素（图片、路径/矢量图形）
- 利用 pdf.js 内置能力处理加密 PDF 的密码验证和解密
- 将解析结果标准化后写入 Document Model

**输入**: `ArrayBuffer`（PDF 文件二进制） + 可选密码
**输出**: `DocumentModel` 结构化对象

**关键挑战 — 文本块聚合算法**:

PDF 文本并不是按"段落"组织的，而是一系列带坐标的绘制指令。需要通过空间位置分析将离散的文本指令聚合为逻辑文本块。

聚合规则（基于启发式算法）:
```
对于相邻的两个文本片段 A 和 B：

同行判定: |A.y - B.y| < A.fontSize * 0.3
  → A 和 B 属于同一行

同段判定: B.y - A.y < A.fontSize * LINE_SPACING_THRESHOLD (默认 1.8)
  → A 和 B 属于同一段落/文本块

新块判定: B.y - A.y >= A.fontSize * LINE_SPACING_THRESHOLD
  → A 和 B 属于不同文本块
```

**阈值可配置**: `LINE_SPACING_THRESHOLD` 和 `CHAR_GAP_THRESHOLD` 需要通过 PoC 阶段用多种 PDF 调校。

**边界情况处理**:
- 多栏布局: 通过 x 坐标的跳跃检测栏分界，分别聚合
- 上标/下标: 检测字号差异 > 30% 且 y 偏移 < 50% 行高，标记为 sub/superscript
- 列表符号: 检测单字符 + 大间距，标记为列表前缀而非正文
- **降级方案**: 允许用户在 UI 中手动拆分/合并文本块

---

#### 模块 2: Font Manager — 字体管理器

**职责**: 从 PDF 中提取嵌入字体，管理字体加载，提供字体度量信息。

**负责人画像**: 熟悉 OpenType/TrueType 字体规范、浏览器字体渲染机制的工程师。

**技术方案**:
- 从 pdf.js 解析结果中提取嵌入的字体数据（TrueType 或 CFF 子集）
- 使用 `opentype.js` 解析字体文件，获取完整的字体度量信息
- 通过 `FontFace` API 将提取的字体注册到浏览器
- 维护字体注册表和度量缓存

**字体支持范围声明**:
| 字体格式 | v1.0 支持状态 |
|---------|-------------|
| TrueType (.ttf) | ✅ 完全支持 |
| OpenType/CFF (.otf) | ✅ 完全支持 |
| Type1 (.pfb/.pfa) | ❌ 不支持，UI 提示 |
| CIDFont | ❌ 不支持，UI 提示 |

**字体回退策略（分级）**:
```
用户输入字符 "X"
    │
    ├── 原始嵌入字体包含 glyph？ → 使用原始字体 ✅
    │
    ├── 同家族完整字体可用？ → 使用完整版本
    │   (如 "ArialMT-subset" → 系统 "Arial")
    │
    ├── 同类型替代？ → 匹配 serif/sans-serif/monospace
    │   (如 "TimesNewRoman" → "Georgia")
    │
    └── 通用备选 → 使用 "sans-serif" 系统默认
        + UI 显示橙色提示："字符 X 使用了替代字体"
```

**度量缓存（性能关键）**:
```typescript
// 字体度量查询是 Layout Engine 的热路径
// 缓存 key: `${fontId}:${charCode}:${fontSize}`
// 预期命中率 > 95%，将 measureText 耗时从 ~0.1ms 降至 ~0.001ms
private metricsCache: Map<string, number> = new Map();
```

---

#### 模块 3: Layout Engine — 排版引擎

**职责**: 当文本内容变化时，重新计算文本块内的布局。

**负责人画像**: 有排版引擎或富文本编辑器开发经验的工程师。

**断行算法 — 混合策略**:
| 场景 | 算法 | 原因 |
|-----|------|------|
| 实时编辑 | **贪心断行** | 保证 < 5ms，满足 60fps |
| 导出前 | **Knuth-Plass** | 保证最优排版质量 |

**增量重排**:
编辑时不全量重排，只重排受影响的行：
```
用户在第 3 行插入一个字符
    │
    ├── 第 3 行是否溢出？
    │     │ 否 → 只重排第 3 行 ✅ (< 1ms)
    │     │ 是 ↓
    │
    ├── 从第 3 行开始，逐行向下重排
    │     │
    │     ├── 每行检查：该行宽度是否改变？
    │     │     │ 否 → 停止，后续行不受影响 ✅
    │     │     │ 是 → 继续重排下一行
    │     │
    │     └── 直到最后一行或宽度稳定
    │
    └── 检查总高度是否溢出 → 触发溢出处理策略（3.3.1）
```

**CJK 断行规则（v1.0 范围）**:
- 任意 CJK 字符边界可断行
- 标点禁则：不允许行首出现 `。，、；：！？）」』】〉》` 等
- 标点禁则：不允许行尾出现 `（「『【〈《` 等
- v2.0 迭代：标点挤压（punctuation compression）、竖排

---

#### 模块 4: Render Engine — 渲染引擎

**职责**: 将文档模型渲染到 Canvas 上供用户查看和交互。

**负责人画像**: 熟悉 Canvas 2D API、性能优化、交互事件处理的前端工程师。

**技术方案**:
- 使用原生 Canvas 2D API（不依赖 fabric.js）
- 分层渲染：底层（图片、路径）→ 文本层 → 编辑状态层 → 叠加层
- 文本渲染使用 `ctx.fillText()` 逐字符精确定位
- 坐标对齐到 `Math.round(x * dpr) / dpr` 以减少 subpixel 偏差

**渲染精度声明**:
- 文本位置精度：±1px（在标准 DPI 下）
- 高 DPI (2x+) 下精度提升至 ±0.5px
- Canvas 尺寸 = CSS 尺寸 × devicePixelRatio

**脏区域重绘**:
```typescript
// 只重绘变化的区域，而非全页
interface DirtyRect {
  x: number; y: number; width: number; height: number;
}

// 编辑时的典型脏区域 = 当前 TextBlock 的 bounds + 10px padding
// 预期单次重绘耗时 < 5ms（vs 全页重绘 ~50-100ms）
```

**HitTest（点击检测）**:
```typescript
// 建立字符级 hitmap，在 LayoutEngine 输出 PositionedGlyph[] 时同步构建
// hitTest 时用二分查找定位行，再线性查找字符
// 复杂度: O(log N) 行 + O(M) 字符/行
hitTest(x: number, y: number): {
  pageIdx: number;
  blockId: string;
  paragraphIdx: number;
  runIdx: number;
  charOffset: number;
} | null;
```

---

#### 模块 5: Edit Engine — 编辑引擎

**职责**: 处理用户的编辑操作，更新文档模型，协调 Layout 和 Render 的刷新。

**负责人画像**: 有富文本编辑器或协作编辑经验的工程师。

**IME 输入法处理方案**:

使用隐藏的 `<textarea>` 捕获键盘输入（Google Docs 同款方案）：

```
┌──────────────────────────────────────────────────┐
│  Canvas (用户看到的)                               │
│  ┌──────────────────────┐                        │
│  │ 这是一段|中文文本      │  ← 光标位置            │
│  └──────────────────────┘                        │
└──────────────────────────────────────────────────┘
       ↑ 视觉层
       │
       │ 同步位置和样式
       │
       ↓ 输入层
┌──────────────────────────────────────────────────┐
│  <textarea> (隐藏的，绝对定位到光标附近)             │
│  - 接收键盘事件和 IME composition                  │
│  - compositionstart → 冻结 Canvas 光标             │
│  - compositionupdate → 渲染预编辑文本（下划线样式）   │
│  - compositionend → 提交最终文本到 DocumentModel     │
└──────────────────────────────────────────────────┘
```

**浏览器兼容性注意点**:
- Chrome: `beforeinput` 可靠，优先使用
- Firefox: `beforeinput` 的 `inputType` 值与 Chrome 略有不同，需要兼容映射
- Safari: `compositionend` 后可能触发额外的 `input` 事件，需要去重
- Android Chrome: 部分输入法不触发 `composition` 事件，需要 fallback 到 `input` 事件

**编辑指令与撤销/重做**:

```typescript
type EditCommand =
  | { type: 'INSERT_TEXT'; pageIdx: number; blockId: string; offset: number; text: string }
  | { type: 'DELETE_TEXT'; pageIdx: number; blockId: string; offset: number; length: number; deletedText: string }
  | { type: 'REPLACE_TEXT'; pageIdx: number; blockId: string; offset: number; length: number; text: string; originalText: string }
  | { type: 'CHANGE_STYLE'; pageIdx: number; blockId: string; offset: number; length: number; style: Partial<TextStyle>; originalStyle: Partial<TextStyle> }
  | { type: 'INSERT_IMAGE'; pageIdx: number; image: ImageElement }
  | { type: 'DELETE_ELEMENT'; pageIdx: number; elementId: string; element: PageElement }
  | { type: 'MOVE_ELEMENT'; pageIdx: number; elementId: string; newPosition: Point; originalPosition: Point }
  | { type: 'ADD_TEXTBLOCK'; pageIdx: number; block: TextBlock };

// 每条 EditCommand 都包含 original 数据，使得撤销时无需反查 Model
```

**连续输入合并**:
- 连续字符输入（间隔 < 500ms）合并为一条 `INSERT_TEXT` 命令
- 遇到空格、回车、方向键时断开合并
- 保证撤销粒度合理（不会一次撤销只删一个字符，也不会一次撤销整段文字）

---

#### 模块 6: Export Module — 导出模块

**职责**: 将编辑后的文档模型序列化回标准 PDF 文件。

**负责人画像**: 熟悉 PDF 文件格式规范的工程师。

**v1.0 导出策略 — 覆盖 + 重绘（Overlay & Redraw）**:

> ⚠️ **为什么不能直接修改内容流？**
> PDF 内容流是线性指令序列，绘制指令之间有累积的坐标状态和字体状态依赖。无法简单"删除"某段文本的绘制指令而不破坏后续指令。pdf-lib 也不具备解析和修改现有内容流的能力。精确内容流编辑将作为 v2.0 迭代目标。

```
对于每个被编辑过的 TextBlock：

1. 在该 TextBlock 的 bounds 区域绘制白色填充矩形
   → 覆盖原始文本的视觉输出

2. 在白色矩形之上，按 DocumentModel 中的精确坐标
   使用 pdf-lib 逐行写入编辑后的文本
   → 嵌入对应字体（含新增字符的 glyph）

3. 对于未编辑的区域
   → 完全保留原始 PDF 数据，不做任何处理
```

**导出坐标转换**: 通过 Coordinate Transformer（模块 7）统一处理。

**导出前验证**:
```typescript
interface ExportValidation {
  overflowBlocks: string[];      // 溢出的文本块 ID
  missingGlyphs: Array<{         // 缺失字符
    blockId: string;
    char: string;
    fallbackFont: string;
  }>;
  warnings: string[];            // 其他警告信息
}

// 导出前自动执行验证
// 有问题时弹窗展示，用户确认后方可导出
```

**v2.0 迭代方向**: 实现 `IContentStreamEditor` 接口，精确解析和修改 PDF 内容流操作符，消除白色矩形覆盖层。

---

#### 模块 7: Coordinate Transformer — 坐标转换器 *(新增)*

**职责**: 提供 Canvas / 排版 / PDF 三套坐标系之间的双向转换。

**背景**: Canvas 坐标系（左上原点，Y 向下）、排版坐标系（左上原点，Y 向下，单位 pt）、PDF 坐标系（左下原点，Y 向上，单位 pt）三者不同，且贯穿所有模块。

```typescript
class CoordinateTransformer {
  constructor(
    private pageWidth: number,   // PDF 页面宽度 (pt)
    private pageHeight: number,  // PDF 页面高度 (pt)
    private scale: number,       // 当前缩放比例
    private dpr: number          // devicePixelRatio
  ) {}

  // 排版坐标 → Canvas 像素坐标
  layoutToCanvas(x: number, y: number): { cx: number; cy: number };

  // Canvas 像素坐标 → 排版坐标
  canvasToLayout(cx: number, cy: number): { x: number; y: number };

  // 排版坐标 → PDF 坐标（Y 轴翻转）
  layoutToPdf(x: number, y: number): { px: number; py: number };

  // PDF 坐标 → 排版坐标
  pdfToLayout(px: number, py: number): { x: number; y: number };

  // 鼠标屏幕坐标 → 排版坐标（含滚动偏移）
  screenToLayout(screenX: number, screenY: number, scrollX: number, scrollY: number): { x: number; y: number };
}
```

**设计原则**: 排版引擎内部统一使用"排版坐标系"（左上原点，Y 向下，单位 pt）。仅在渲染到 Canvas 和导出到 PDF 时进行坐标转换。

---

### 4.3 Document Model — 核心数据结构

```typescript
// ============== 顶层文档 ==============
interface DocumentModel {
  metadata: PDFMetadata;
  pages: PageModel[];
  fonts: Map<string, RegisteredFont>;
}

interface PDFMetadata {
  title?: string;
  author?: string;
  pageCount: number;
  encrypted: boolean;
}

// ============== 页面 ==============
interface PageModel {
  index: number;
  width: number;         // PDF 点单位 (1 point = 1/72 inch)
  height: number;
  elements: PageElement[];
  dirty: boolean;        // 是否被编辑过
}

type PageElement = TextBlock | ImageElement | PathElement | OverlayElement;

// ============== 文本块 ==============
interface TextBlock {
  type: 'text';
  id: string;
  bounds: Rect;
  originalBounds: Rect;  // ← 新增：原始边界，用于溢出检测
  paragraphs: Paragraph[];
  editable: boolean;
  overflowState: OverflowState; // ← 新增
}

type OverflowState =
  | { status: 'normal' }
  | { status: 'within_tolerance'; overflowPercent: number }
  | { status: 'auto_shrunk'; adjustments: ShrinkAdjustment[] }
  | { status: 'overflowing'; overflowPercent: number };

interface ShrinkAdjustment {
  type: 'lineSpacing' | 'letterSpacing' | 'fontSize';
  originalValue: number;
  adjustedValue: number;
}

interface Paragraph {
  runs: TextRun[];
  alignment: 'left' | 'center' | 'right' | 'justify';
  lineSpacing: number;
  lines?: LayoutLine[];
}

interface TextRun {
  text: string;
  style: TextStyle;
}

interface TextStyle {
  fontId: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  color: Color;
  letterSpacing?: number;
  isFallbackFont?: boolean;  // ← 新增：是否使用了替代字体
}

// ============== 布局结果 ==============
interface LayoutLine {
  glyphs: PositionedGlyph[];
  baseline: number;
  width: number;
  height: number;
}

interface PositionedGlyph {
  char: string;
  x: number;             // 排版坐标系（左上原点，Y 向下，单位 pt）
  y: number;
  width: number;
  height: number;
  style: TextStyle;
}

// ============== 图片 ==============
interface ImageElement {
  type: 'image';
  id: string;
  bounds: Rect;
  imageData: Uint8Array;
  mimeType: 'image/png' | 'image/jpeg';
  rotation?: number;
}

// ============== 矢量路径 ==============
interface PathElement {
  type: 'path';
  id: string;
  commands: PathCommand[];
  fillColor?: Color;
  strokeColor?: Color;
  strokeWidth?: number;
}

// ============== 叠加层 ==============
interface OverlayElement {
  type: 'overlay';
  id: string;
  kind: 'drawing' | 'shape' | 'stamp' | 'annotation';
  bounds: Rect;
  data: any;
}

// ============== 基础类型 ==============
interface Rect {
  x: number; y: number; width: number; height: number;
}

interface Color {
  r: number; g: number; b: number; a?: number;
}

type PathCommand =
  | { op: 'M'; x: number; y: number }
  | { op: 'L'; x: number; y: number }
  | { op: 'C'; cp1x: number; cp1y: number; cp2x: number; cp2y: number; x: number; y: number }
  | { op: 'Z' };
```

### 4.4 技术栈选型

| 层级 | 技术 | 说明 |
|-----|------|------|
| 构建工具 | **Vite 5** | 快速的开发服务器和构建工具 |
| 前端框架 | **React 18** | 组件化 UI 开发，管理编辑器外壳和面板 |
| 编程语言 | **TypeScript 5** | 全量 TS，所有模块强类型 |
| 样式方案 | **Tailwind CSS 3** | 原子化 CSS，快速构建美观 UI |
| 状态管理 | **Zustand** | 管理纯 UI 状态；DocumentModel 由 EditorCore 管理 |
| PDF 解析 | **pdfjs-dist** | 解析 PDF 结构、提取文本和字体、处理加密 |
| PDF 导出 | **pdf-lib** | 生成和修改 PDF 文件，嵌入字体和内容 |
| 字体解析 | **opentype.js** | 解析字体文件，获取 glyph 度量和 kerning 数据 |
| 画布渲染 | **Canvas 2D API** (原生) | 完全控制文本渲染和交互 |
| 叠加层 | **原生 Canvas 2D** | 自研简易对象管理（拖拽/缩放），避免 fabric.js 200KB bundle |
| 图标 | **Lucide React** | 简洁美观的图标库 |
| 测试 | **Vitest + Playwright** | 单元测试 + 端到端测试 |

> **关于 fabric.js 的决定**: 评审后决定不使用 fabric.js。两个 Canvas 层（原生 + fabric）的事件分发过于复杂。叠加层所需的拖拽/缩放/选中功能通过自研 `OverlayManager` 实现（约 500-800 行代码），换取完全可控的事件流和零额外 bundle。

### 4.5 项目目录结构

```
pdf-editor/
├── public/
│   └── pdf.worker.min.mjs
├── src/
│   ├── core/                              # ====== 核心引擎层 ======
│   │   ├── interfaces/                    # ← 新增：所有模块接口定义
│   │   │   ├── IPdfParser.ts
│   │   │   ├── IFontManager.ts
│   │   │   ├── ILayoutEngine.ts
│   │   │   ├── IRenderEngine.ts
│   │   │   ├── IEditEngine.ts
│   │   │   ├── IExportModule.ts
│   │   │   ├── IEditorCore.ts             # ← 新增：顶层接口
│   │   │   └── events.ts                  # ← 新增：事件类型定义
│   │   ├── model/
│   │   │   ├── DocumentModel.ts
│   │   │   └── ModelOperations.ts
│   │   ├── parser/
│   │   │   ├── PdfParser.ts
│   │   │   ├── TextBlockBuilder.ts
│   │   │   ├── ImageExtractor.ts
│   │   │   └── PathExtractor.ts
│   │   ├── font/
│   │   │   ├── FontManager.ts
│   │   │   ├── FontExtractor.ts
│   │   │   ├── FontMetrics.ts
│   │   │   └── FontFallback.ts
│   │   ├── layout/
│   │   │   ├── LayoutEngine.ts
│   │   │   ├── GreedyLineBreaker.ts       # ← 明确：贪心算法（实时编辑）
│   │   │   ├── KnuthPlassLineBreaker.ts   # ← 明确：KP 算法（导出）
│   │   │   ├── TextMeasurer.ts
│   │   │   ├── ParagraphLayout.ts
│   │   │   └── OverflowHandler.ts         # ← 新增：溢出处理
│   │   ├── render/
│   │   │   ├── RenderEngine.ts
│   │   │   ├── TextRenderer.ts
│   │   │   ├── ImageRenderer.ts
│   │   │   ├── PathRenderer.ts
│   │   │   ├── SelectionRenderer.ts
│   │   │   ├── HitTester.ts
│   │   │   └── OverlayManager.ts          # ← 替代 fabric.js
│   │   ├── editor/
│   │   │   ├── EditEngine.ts
│   │   │   ├── CursorManager.ts
│   │   │   ├── SelectionManager.ts
│   │   │   ├── InputHandler.ts
│   │   │   ├── ImeHandler.ts              # ← 新增：IME 专项处理
│   │   │   ├── CommandHistory.ts
│   │   │   └── EditCommands.ts
│   │   ├── export/
│   │   │   ├── ExportModule.ts
│   │   │   ├── OverlayRedrawStrategy.ts   # ← 明确：覆盖+重绘策略
│   │   │   ├── ExportValidator.ts         # ← 新增：导出前验证
│   │   │   └── FontEmbedder.ts
│   │   ├── infra/                         # ← 新增：基础设施
│   │   │   ├── CoordinateTransformer.ts
│   │   │   ├── EventBus.ts
│   │   │   └── Logger.ts
│   │   └── EditorCore.ts                  # 顶层组装
│   │
│   ├── components/                        # ====== React UI 层 ======
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Toolbar.tsx
│   │   │   └── PropertyPanel.tsx
│   │   ├── editor/
│   │   │   ├── EditorCanvas.tsx
│   │   │   └── TextEditInput.tsx
│   │   ├── upload/
│   │   │   ├── UploadZone.tsx
│   │   │   └── PasswordModal.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       ├── Tooltip.tsx
│   │       ├── Slider.tsx
│   │       ├── ColorPicker.tsx
│   │       └── FontSelector.tsx
│   │
│   ├── hooks/
│   │   ├── useEditorCore.ts
│   │   ├── useKeyboardShortcuts.ts
│   │   └── useExportPdf.ts
│   ├── store/
│   │   └── uiStore.ts
│   ├── types/                             # ← 按模块拆分
│   │   ├── document.ts
│   │   ├── font.ts
│   │   ├── events.ts
│   │   └── ui.ts
│   ├── config/                            # ← 新增
│   │   ├── constants.ts                   # 性能阈值、聚合参数等
│   │   └── defaults.ts                    # 默认字体、颜色等
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── __tests__/                             # ← 新增：完整测试体系
│   ├── unit/
│   │   ├── parser/
│   │   ├── font/
│   │   ├── layout/
│   │   ├── render/
│   │   ├── editor/
│   │   ├── export/
│   │   └── infra/
│   ├── integration/
│   │   ├── parser-layout-render.test.ts
│   │   ├── edit-layout-render.test.ts
│   │   └── export-roundtrip.test.ts
│   ├── e2e/
│   │   ├── upload-edit-export.e2e.test.ts
│   │   └── keyboard-shortcuts.e2e.test.ts
│   ├── perf/
│   │   ├── layout-perf.test.ts
│   │   └── render-perf.test.ts
│   └── fixtures/                          # 测试用 PDF 样本
│       ├── simple-english.pdf
│       ├── simple-chinese.pdf
│       ├── multi-column.pdf
│       ├── mixed-fonts.pdf
│       ├── encrypted.pdf
│       └── large-50pages.pdf
│
├── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vite.config.ts
└── vitest.config.ts                       # ← 新增
```

### 4.6 模块协作时序

以"用户双击文本块 → 输入一个字符"为例：

```
用户双击 Canvas 上的文本
    │
    ▼
RenderEngine.HitTester
    → 屏幕坐标 → CoordinateTransformer.screenToLayout() → 排版坐标
    → 判定命中哪个 TextBlock、哪个字符位置
    │
    ▼
EditEngine.CursorManager
    → 放置光标，进入编辑模式
    → 激活隐藏的 <textarea>
    │
    ▼
EventBus.emit('editStart', { blockId })
    → RenderEngine 渲染光标 + 编辑边框
    → UIStore 更新 propertyPanel
    │
    ▼
用户按下键盘输入字符 "A"
    │
    ▼
EditEngine.InputHandler（或 ImeHandler）
    → 生成 EditCommand，推入 CommandHistory
    → 更新 DocumentModel
    │
    ▼
EventBus.emit('textChanged', { pageIdx, blockId })
    │
    ├──▶ LayoutEngine.reflowTextBlock()（增量重排）
    │       → 查询 FontManager 度量缓存
    │       → 贪心断行算法
    │       → 检查溢出 → 更新 OverflowState
    │       → 输出更新后的 PositionedGlyph[]
    │
    └──▶ RenderEngine.setDirtyRect(block.bounds)
            → 脏区域重绘
            → 更新光标位置
            │
            ▼
         用户看到字符出现，后续文本自动重排
```

---

## 五、界面设计

### 5.1 设计风格

- **整体风格**: 现代简约，参考 Figma / Notion 的设计语言
- **配色方案**: 浅色编辑区为主（v1.0 仅浅色主题，深色主题延后）
- **主色调**: Indigo (#6366F1) 作为品牌色，搭配中性灰色系
- **圆角**: 统一使用 8px 圆角
- **阴影**: 使用轻微投影增加层次感

### 5.2 页面布局

```
┌─────────────────────────────────────────────────────┐
│  Header: Logo  |  文件名  |  缩放控件  |  导出按钮    │
├────────┬────────────────────────────────┬────────────┤
│        │                                │            │
│ (v1.0  │       PDF 编辑画布区域          │  属性面板   │
│  无缩略 │     (Canvas 2D 渲染)           │ (文本样式   │
│  图面板)│                                │  字体选择   │
│        │   ┌─ 选中文本块示意 ──────┐     │  颜色/字号  │
│        │   │ The quick brown fox  │     │  对齐方式   │
│        │   │ jumps over the |     │     │  溢出警告)  │
│        │   │ lazy dog.            │     │            │
│        │   └───────────────────────┘     │            │
│        │                                │            │
├────────┴────────────────────────────────┴────────────┤
│  Toolbar: 选择|文本编辑|新增文本|图片|画笔|形状|撤销/重做 │
└─────────────────────────────────────────────────────┘
```

### 5.3 关键页面说明

**① 欢迎/上传页面**
- 居中展示上传区域，支持拖拽和点击
- 大面积留白，配合品牌色渐变背景
- 展示产品特性的简要说明

**② 编辑器主页面**
- 两栏布局（v1.0）：左侧画布 + 右侧属性面板
- 工具栏浮动在画布下方居中位置，胶囊式设计
- 编辑模式下文本块显示蓝色虚线边框
- 溢出时文本块边框变为橙色，属性面板显示警告

**③ 密码输入弹窗**
- 模态弹窗，密码输入框 + 确认/取消

**④ 导出弹窗**
- 自定义文件名
- 显示验证结果（溢出/缺字警告）
- 导出进度条

---

## 六、状态管理设计

### 6.1 双轨状态架构

```typescript
// ====== 核心编辑状态（EditorCore 管理，React 外部）======
class EditorCore implements IEditorCore {
  documentModel: DocumentModel;
  fontManager: IFontManager;
  layoutEngine: ILayoutEngine;
  renderEngine: IRenderEngine;
  editEngine: IEditEngine;
  exportModule: IExportModule;
  coordinator: CoordinateTransformer;
  private eventBus: EventBus;

  // 导出前冻结模型，防止中间状态
  async exportPdf(): Promise<Uint8Array> {
    if (this.editEngine.isEditing()) {
      this.editEngine.exitEditMode();  // 先退出编辑
    }
    const snapshot = deepClone(this.documentModel);  // 快照
    const validation = this.exportModule.validate(snapshot, this.fontManager);
    return { snapshot, validation };  // UI 层展示验证结果，用户确认后导出
  }
}
```

### 6.2 事件总线规范

```typescript
// ====== 事件类型定义（细粒度）======
interface EditorEvents {
  // 模型变更（细粒度，告知 React 具体哪个元素变了）
  'textChanged':     { pageIdx: number; blockId: string };
  'elementAdded':    { pageIdx: number; elementId: string };
  'elementRemoved':  { pageIdx: number; elementId: string };
  'elementMoved':    { pageIdx: number; elementId: string };
  'pageChanged':     { pageIdx: number };

  // 编辑状态
  'editStart':       { blockId: string };
  'editEnd':         { blockId: string };
  'cursorMoved':     { pageIdx: number; blockId: string; charOffset: number };
  'selectionChanged': { blockId: string; startOffset: number; endOffset: number } | null;

  // 警告
  'overflow':        { blockId: string; state: OverflowState };
  'fontFallback':    { blockId: string; char: string; fallbackFontId: string };

  // 错误
  'error':           { code: string; message: string };
}
```

### 6.3 UI 状态（Zustand）

```typescript
interface UIState {
  activeTool: 'select' | 'editText' | 'addText' | 'image' | 'draw' | 'shape';
  zoom: number;
  currentPage: number;
  totalPages: number;
  propertyPanelOpen: boolean;
  isExporting: boolean;
  exportProgress: number;

  // 从 EventBus 同步过来的展示状态
  selectedBlockId: string | null;
  currentTextStyle: TextStyle | null;   // 属性面板展示用
  overflowWarnings: string[];           // 有溢出的 blockId 列表

  // Actions
  setActiveTool: (tool: ActiveTool) => void;
  setZoom: (zoom: number) => void;
  setCurrentPage: (page: number) => void;
}
```

> **同步机制**: `useEditorCore` hook 中通过 `eventBus.on('textChanged', ...)` 等事件监听，有选择性地更新 Zustand store。只有 UI 面板需要展示的信息才同步到 Zustand，Canvas 的刷新由 RenderEngine 直接驱动。

---

## 七、用户交互流程

```
用户打开应用
    │
    ▼
展示欢迎页面 + 上传区域
    │
    ├── 拖拽 PDF 文件 ──┐
    │                   │
    ├── 点击上传按钮 ───┤
    │                   ▼
    │            读取 PDF 文件
    │                   │
    │        ┌── 是否加密？──┐
    │        │ 否           │ 是
    │        │              ▼
    │        │        弹出密码输入框
    │        │              │
    │        │         输入密码解密
    │        │              │
    │        │    ┌── 密码正确？──┐
    │        │    │ 是          │ 否
    │        │    │             ▼
    │        │    │        提示重新输入
    │        ▼    ▼
    │    PDF Parser 解析
    │    Font Manager 提取注册字体
    │    Layout Engine 计算初始布局
    │    Render Engine 渲染到 Canvas
    │         │
    │    进入编辑器界面
    │         │
    │    ┌────┴────────────┐
    │    │                 │
    │    ▼                 ▼
    │  双击原文文本块      使用工具添加新内容
    │  进入编辑模式        (新增文本/图片/绘图)
    │    │                 │
    │    ▼                 │
    │  修改文字             │
    │  → Layout 增量重排    │
    │  → Render 脏区域刷新  │
    │  → 溢出检测和处理     │
    │    │                 │
    │    └────┬────────────┘
    │         │
    │    点击"导出 PDF"
    │         │
    │    ExportValidator 验证
    │         │
    │    ┌── 有警告？──┐
    │    │ 否         │ 是
    │    │            ▼
    │    │     弹窗展示警告
    │    │     用户确认继续
    │    ▼            │
    │    Export Module 覆盖+重绘导出
    │         │
    │    浏览器下载 PDF 文件
    ▼
  完成
```

---

## 八、非功能需求

### 8.1 性能

| 指标 | 目标 | 测量方式 |
|-----|------|---------|
| 首屏加载 | < 3 秒 | Lighthouse |
| PDF 解析 + 模型构建 | < 2 秒（10 页文档） | Vitest perf |
| 单页渲染 | < 200ms | Vitest perf |
| 单次编辑到画面刷新 | < 16ms (60fps) | performance.now() |
| 文本块增量重排 | < 5ms | Vitest perf |
| 字体度量缓存命中率 | > 95% | Logger 统计 |
| 最大文件 | 50MB | E2E 测试 |
| 最大页数 | 200 页 | E2E 测试 |

### 8.2 渲染精度

- 文本位置精度: ±1px（标准 DPI），±0.5px（高 DPI 2x+）
- 坐标对齐策略: `Math.round(value * dpr) / dpr`

### 8.3 兼容性

| 浏览器 | v1.0 支持 | 说明 |
|-------|----------|------|
| Chrome 90+ | ✅ 主要目标 | MVP 优先保证 Chrome 质量 |
| Edge 90+ | ✅ | 同 Chromium 内核 |
| Firefox 90+ | ⚠️ 尽力支持 | IME 行为有差异，可能有已知问题 |
| Safari 15+ | ⚠️ 尽力支持 | Canvas/FontFace 行为有差异 |

### 8.4 安全性

- 所有文件处理在浏览器端完成，不传输到服务器
- 不使用 cookie 或 localStorage 存储文件内容
- 页面关闭后内存中的文件数据自动释放

---

## 九、键盘快捷键

| 快捷键 | 功能 |
|-------|------|
| `Ctrl + Z` | 撤销 |
| `Ctrl + Shift + Z` | 重做 |
| `Ctrl + S` | 导出保存 |
| `Ctrl + +` / `Ctrl + -` | 放大 / 缩小 |
| `Ctrl + 0` | 重置缩放 |
| `Ctrl + A` | 全选当前文本块内容 |
| `Delete` / `Backspace` | 删除选中内容/元素 |
| `Escape` | 退出编辑模式 / 取消选中 |
| `V` | 切换到选择工具 |
| `E` | 切换到文本编辑模式 |
| `T` | 切换到新增文本工具 |
| `←` `→` | 编辑模式下移动光标 / 非编辑模式下切换页面 |

---

## 十、测试策略

### 10.1 测试金字塔

```
            ╱╲
           ╱  ╲         E2E 测试（Playwright）
          ╱ 5% ╲        上传→编辑→导出完整流程 × 3种PDF
         ╱──────╲
        ╱        ╲      集成测试
       ╱   15%    ╲     Parser→Layout→Render 链路
      ╱────────────╲    Edit→Layout→Render 链路
     ╱              ╲   Export 往返测试（roundtrip）
    ╱     80%        ╲
   ╱  单元测试         ╲ 各模块独立测试
  ╱════════════════════╲
```

### 10.2 各模块测试要求

| 模块 | 最低 case 数 | 重点测试场景 |
|-----|-------------|------------|
| **Parser** | 100+ | 文本块聚合（单栏/多栏/列表/上标）、字体提取、加密解密 |
| **FontManager** | 60+ | 度量精度、回退策略、缓存命中、缺字检测 |
| **LayoutEngine** | 150+ | 贪心断行、KP 断行、CJK 禁则、两端对齐、溢出处理、增量重排 |
| **RenderEngine** | 80+ | HitTest 精度、脏区域重绘、高 DPI 适配 |
| **EditEngine** | 100+ | 光标移动、选区操作、IME composition、撤销/重做、连续输入合并 |
| **ExportModule** | 80+ | 坐标转换精度、字体嵌入、覆盖区域、未编辑页面保留 |
| **CoordinateTransformer** | 40+ | 三套坐标系互转、极端缩放、旋转 |

### 10.3 关键集成测试

**往返测试（Roundtrip）** — 最重要的质量保证：
```typescript
test('edit text and verify roundtrip', async () => {
  // 1. 导入 PDF
  const original = await loadFixture('simple-english.pdf');
  const model = await parser.parse(original);

  // 2. 修改文本
  const block = findTextBlock(model, 0);
  editEngine.enterEditMode(block.id);
  editEngine.handleInput(createInputEvent('Hello World'));
  editEngine.exitEditMode();

  // 3. 导出
  const exported = await exportModule.export(original, model, fontManager);

  // 4. 重新导入，验证修改生效
  const reimported = await parser.parse(exported);
  const text = extractText(reimported, 0);
  expect(text).toContain('Hello World');
});
```

### 10.4 性能基准测试

```typescript
describe('Performance Benchmarks', () => {
  test('layout reflow < 5ms for normal paragraph', () => {
    const block = createTextBlock(500); // 500 字符
    const start = performance.now();
    layoutEngine.reflowTextBlock(block, fontManager);
    expect(performance.now() - start).toBeLessThan(5);
  });

  test('hitTest < 1ms', () => {
    const page = createPageWithBlocks(10);
    const start = performance.now();
    renderEngine.hitTest(100, 200);
    expect(performance.now() - start).toBeLessThan(1);
  });
});
```

### 10.5 测试 PDF 样本库

| 文件名 | 用途 | 特征 |
|-------|------|------|
| `simple-english.pdf` | 基础功能验证 | 纯英文，单栏，1 种字体 |
| `simple-chinese.pdf` | CJK 断行测试 | 纯中文，含标点 |
| `mixed-fonts.pdf` | 字体处理测试 | 3+ 种字体混排 |
| `multi-column.pdf` | 文本聚合测试 | 双栏布局 |
| `encrypted.pdf` | 解密测试 | 密码保护 |
| `large-50pages.pdf` | 性能测试 | 50 页，多种元素 |
| `forms.pdf` | 边界测试 | 表单字段（v1.0 不编辑，但不能崩溃） |

---

## 十一、后续迭代方向（v2.0）

- **精确内容流编辑** — 实现 `IContentStreamEditor`，消除白色覆盖层
- **PDF 表单填写** — 识别并填写交互式表单字段
- **OCR 文字识别** — 扫描版 PDF 转可编辑文本块
- **多人协作编辑** — 基于 CRDT（EditCommand 天然适合）
- **跨文本块重排** — 溢出时内容流入下一个关联文本块
- **PDF 页面管理** — 页面重排、删除、插入、合并
- **页面缩略图面板** — 从 v1.0 延后
- **深色主题**
- **国际化 (i18n)**

---

## 十二、里程碑计划

### Phase 0: PoC 验证（Week 0，开发前）— 3-5 天

> ⚠️ **全员一致建议在正式开发前完成以下 PoC。如果 PoC 失败，需要调整架构方向。**

| PoC 项目 | 负责人 | 天数 | 验证目标 | 通过标准 |
|---------|-------|------|---------|---------|
| **Parser 文本聚合** | 工程师 A | 2-3 天 | 用 5 个不同复杂度的 PDF 测试聚合算法 | ≥ 80% 的文本块边界正确 |
| **字体提取→渲染链路** | 工程师 B | 1-2 天 | 提取嵌入字体 → opentype.js 解析 → FontFace 注册 → Canvas fillText | 字符宽度误差 < 2% |
| **覆盖+重绘导出** | 工程师 E | 2 天 | 白色矩形覆盖 + pdf-lib 重新写入文本 | 导出 PDF 可正常打开，文本位置偏差 < 3px |
| **IME 输入预研** | 工程师 D | 1 天 | 隐藏 textarea 在 Chrome/Firefox/Safari 下的 composition 行为 | 中文输入可正确提交 |

### Phase 1: 基础设施（Week 1）— 全员

| 任务 | 说明 | 人天 |
|-----|------|-----|
| 项目初始化 | Vite + React + TS + Tailwind + Vitest + ESLint + CI | 1 |
| **接口冻结** | 在 `src/core/interfaces/` 定义并评审所有模块接口 | 2 |
| DocumentModel 类型定义 | 确定所有数据结构 | 1 |
| CoordinateTransformer | 实现 + 单元测试 | 1 |
| EventBus | 实现 + 事件类型定义 | 0.5 |
| UI 壳子 | 两栏布局、Header、Toolbar、上传页面 | 3 |
| 测试框架 | Vitest 配置 + Playwright 配置 + 测试 PDF 样本库 | 1 |

### Phase 2: 核心模块并行开发（Week 2-5）

```
              Week 2          Week 3          Week 4          Week 5
工程师A    ┌─ PDF Parser ──────────────────┐ ┌─ Parser 测试 ───┐
           │ 文本提取→文本块聚合→图片提取   │ │ 100+ test cases │
           └───────────────────────────────┘ └────────────────┘

工程师B    ┌─ Font Manager ──────┐ ┌─ Layout Engine ─────────────────────┐
           │ 字体提取+注册+回退   │ │ 贪心断行→KP断行→CJK→对齐→溢出处理  │
           └─────────────────────┘ └───────────────────────────────────┘

工程师C    ┌─ Render Engine ──────────────────────────────────────────┐
           │ 文本渲染→图片渲染→选区/光标→HitTest→OverlayManager→脏区域│
           └─────────────────────────────────────────────────────────┘

工程师D    ┌─ Edit Engine ───────────────────────────────────────────┐
           │ 光标管理→输入处理→IME→选区→指令历史→连续输入合并        │
           └─────────────────────────────────────────────────────────┘

工程师E    ┌─ Export Module ──────────────────┐ ┌─ UI 面板开发 ─────┐
           │ 覆盖策略→字体嵌入→验证→坐标转换  │ │ 属性面板/字体选择 │
           └─────────────────────────────────┘ └──────────────────┘
```

### Phase 3: 集成联调（Week 6-7）

| 任务 | 说明 | 人天 |
|-----|------|-----|
| 模块串联 | Parser → Model → Layout → Render → Edit 全链路打通 | 5 |
| Canvas-React 集成 | EditorCanvas 组件、事件分发、UIStore 同步 | 3 |
| 导出联调 | 编辑后导出 PDF 验证 + 往返测试 | 3 |
| UI 联调 | 属性面板、字体选择器、颜色选择器、溢出警告 | 2 |
| 集成测试 | 补充集成测试 case | 2 |

### Phase 4: 打磨与稳定化（Week 8-9）

| 任务 | 说明 | 人天 |
|-----|------|-----|
| Bug 修复 | 集成后的问题修复 | 5 |
| 性能优化 | 脏区域重绘验证、度量缓存调优、Worker 异步 | 3 |
| 浏览器兼容性 | Chrome 精修 + Firefox/Safari 已知问题记录 | 2 |
| E2E 测试 | 完整流程回归 | 2 |
| 文档 | 架构文档、API 文档 | 1 |
| 部署 | 构建优化 + 静态部署 | 1 |

**总计**: **PoC 1 周 + 正式开发 9 周**，5 人并行

### 每周里程碑检查点

| 时间点 | 检查内容 | 不通过则 |
|-------|---------|---------|
| Week 0 末 | PoC 全部通过 | 调整架构方向 |
| Week 1 末 | 接口冻结，此后不再修改 | 延后正式开发 |
| Week 3 末 | Parser 能正确解析 3+ 种 PDF | 调整聚合算法参数 |
| Week 4 末 | Layout + Render 能渲染编辑后的文本 | 评估风险 |
| Week 5 末 | Edit → Layout → Render 链路可用 | 调整集成计划 |
| Week 7 末 | 全链路打通，导出可用 | 延期发布 |

---

## 十三、技术风险与应对

| 风险 | 概率 | 影响 | 应对策略 | 降级方案 |
|-----|------|------|---------|---------|
| **Parser 文本块聚合不准确** | 高 | 核心功能受损 | PoC 阶段验证；可配置阈值 | 允许用户手动拆分/合并文本块 |
| **嵌入字体子集缺字** | 高 | 新字符渲染异常 | 分级回退策略 + UI 提示 | 显示替代字体 + 橙色标记 |
| **导出坐标偏差** | 高 | 文本位置错位 | CoordinateTransformer 统一转换 + 往返测试验证 | 导出前预览对比 |
| **CJK 排版边界情况** | 中 | 标点位置异常 | v1.0 实现基本禁则规则 | 标注"CJK 排版 Beta" |
| **Canvas IME 兼容性** | 中 | 中文输入异常 | 隐藏 textarea + PoC 预研 | 仅保证 Chrome 完整支持 |
| **大文件性能** | 中 | 卡顿/崩溃 | 按需解析 + Web Worker | 限制上传文件大小 |
| **集成时接口不匹配** | 中 | 返工 | Week 1 冻结接口 + 每周检查点 | 提前发现，及时调整 |
| **白色覆盖层可见** | 低 | 覆盖区域边缘可见白线 | 覆盖区域扩大 2px padding | 用户可接受的视觉差异 |

---

## 十四、模块接口契约

### 14.1 顶层接口

```typescript
// ====== EditorCore 顶层接口 ======
interface IEditorCore {
  // 初始化
  loadPdf(data: ArrayBuffer, password?: string): Promise<void>;

  // 状态查询
  getDocument(): DocumentModel;
  getCurrentPage(): number;
  isEditing(): boolean;

  // 事件订阅
  on<K extends keyof EditorEvents>(event: K, callback: (data: EditorEvents[K]) => void): () => void;

  // 导出
  validateForExport(): ExportValidation;
  exportPdf(onProgress?: (p: number) => void): Promise<Uint8Array>;

  // 销毁
  destroy(): void;
}
```

### 14.2 模块接口

```typescript
// ====== 模块 1: PDF Parser ======
interface IPdfParser {
  parse(data: ArrayBuffer, password?: string): Promise<DocumentModel>;
}

// ====== 模块 2: Font Manager ======
interface IFontManager {
  extractAndRegister(pdfDoc: PDFDocumentProxy): Promise<void>;
  getMetrics(fontId: string): FontMetrics;
  measureText(text: string, fontId: string, fontSize: number): { width: number; height: number };
  getAvailableFonts(): FontInfo[];
  getFontFace(fontId: string): FontFace | null;
  hasGlyph(fontId: string, char: string): boolean;
  getFallbackFont(fontId: string, char: string): string;
}

// ====== 模块 3: Layout Engine ======
interface ILayoutEngine {
  reflowTextBlock(block: TextBlock, fontManager: IFontManager): TextBlock;
  reflowPage(page: PageModel, fontManager: IFontManager): PageModel;
  setStrategy(strategy: 'greedy' | 'knuth-plass'): void;
}

// ====== 模块 4: Render Engine ======
interface IRenderEngine {
  bindCanvas(canvas: HTMLCanvasElement): void;
  renderPage(page: PageModel, viewport: Viewport): void;
  renderSelection(selection: SelectionRange): void;
  renderCursor(cursor: CursorPosition): void;
  hitTest(x: number, y: number): HitTestResult | null;
  setDirtyRect(rect: Rect): void;
  clearDirtyRect(): void;
}

// ====== 模块 5: Edit Engine ======
interface IEditEngine {
  enterEditMode(blockId: string): void;
  exitEditMode(): void;
  isEditing(): boolean;
  handleInput(event: InputEvent): void;
  handleKeyDown(event: KeyboardEvent): void;
  handleComposition(event: CompositionEvent): void;
  getCursorPosition(): CursorPosition;
  getSelection(): SelectionRange | null;
  applyStyle(selection: SelectionRange, style: Partial<TextStyle>): void;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
}

// ====== 模块 6: Export Module ======
interface IExportModule {
  validate(model: DocumentModel, fontManager: IFontManager): ExportValidation;
  export(
    originalPdf: ArrayBuffer,
    model: DocumentModel,
    fontManager: IFontManager,
    onProgress?: (progress: number) => void
  ): Promise<Uint8Array>;
}

// ====== 模块 7: Coordinate Transformer ======
interface ICoordinateTransformer {
  layoutToCanvas(x: number, y: number): { cx: number; cy: number };
  canvasToLayout(cx: number, cy: number): { x: number; y: number };
  layoutToPdf(x: number, y: number): { px: number; py: number };
  pdfToLayout(px: number, py: number): { x: number; y: number };
  screenToLayout(screenX: number, screenY: number, scrollX: number, scrollY: number): { x: number; y: number };
  updateViewport(scale: number, dpr: number, pageWidth: number, pageHeight: number): void;
}
```

> **接口冻结规则**: Week 1 结束前完成所有接口评审并冻结。此后如需修改接口，必须通过全员评审 + 影响范围评估后方可变更。
