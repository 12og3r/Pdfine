# AI Technical Spec: [任务名称，如：新增会员卡片]

## 1. Basic Info (基本信息)
*   **Platform:** [Android | iOS]
*   **App:** [TikTok | TikTok-Lite | TikTok-TV]
*   **Goal:** [一句话描述需求与目标]

## 2. Editable Scope & File Manifest (改动范围 & 文件清单)
*   **Modification Boundary**: 只能修改 `/Users/liuguidong/Documents/ByteDance/TikTok/Modules/TikTokSocial/TikTokSocial` 内文件
*   **Target Files (文件清单):** [绝对路径，并附上对应改动的一句话说明]
    *   `[NEW]` `/member/MemberCard.kt`: [新建卡片组件]
    *   `[MOD]` `/home/HomeActivity.kt`: [增加入口逻辑]
    *   `[REF]` `ui/common/BaseCard.kt`: [参考现有的圆角样式]

## 3. UI/UX Structure (界面交互结构描述) (Optional)
*   **Figma设计稿:** (重要: 不同 UI 区块请尽量贴对应的独立 Figma node 链接)
    - **Story Tab 投稿入口 – StoryArchivePostEntranceCellComponent**
      - 说明：新增 Story 投稿入口卡片组件
      - Figma Url：
        - https://www.figma.com/design/BwNoj2PRjqCMgfAjcS7OuQ/%E2%9C%A8-Story-2025-Q4?node-id=431-30094&m=dev
      - **TUX 组件约束:** (可选，但如有明确要求请填写)
        - 使用组件: [例如: `TUXIntroPanel`]
      - 相对位置（Anchor）：(optional)
        - 相对于：`StoryArchiveCellComponent`
        - 布局位置：位于 Archive 头部下方，内容列表之前

## 4. Data Models & API (数据模型与接口) (Optional)
*   **Models (Pseudo-code / JSON):**
    ```kotlin
    // 必须定义核心字段类型
    data class MemberInfo(
        val level: Int, // 1=Silver, 2=Gold
        val expireTime: Long,
        val benefits: List<String>
    )
    ```
*   **API Interactions:**
    *   `GET /api/v1/member/info`
    *   Loading: `showSkeleton()`
    *   Error: `Toast.show("Network Error")`

## 5. Business Logic (业务逻辑流程)
*使用 "When -> Then" 格式描述交互。*
1.  **Init (初始化):**
    *   页面加载 -> 请求 API -> (Loading) -> 渲染 UI。
2.  **Interaction (交互):**
    *   **When** 用户点击 "Renew" 按钮:
        *   **Then** 检查 `isVip` 状态。
        *   **If** true -> 跳转 `RenewActivity`。
        *   **Else** -> 弹出 `UpgradeDialog`。

## 6. Event Tracking (埋点设计) (Optional)
*如果此需求涉及埋点，请填写此部分；否则可删除或标注 "N/A"*

### 6.1 新增埋点

| Event Name | 触发时机 | 触发类型 | 描述 |
|------------|---------|---------|------|
| [例如: `ttsocial_story_archive_shoot_cell_click`] | [例如: 点击投稿 cell 时] | `click` | [例如: 用户点击 Story Archive 中的投稿入口] |

**参数定义:**

| 参数名 | 类型 | 取值 | 描述 | 是否必填 |
|--------|------|------|------|---------|
| `position` | string | `upload_page`, `private_tab` | 触发位置 | 是 |
| `tab_name` | string | `story_tab`, `thought_tab` | 当前所在的 tab | 是 |

### 6.2 已有埋点参数变更

| Event Name | 变更类型 | 参数名 | 参数描述 | 取值 |
|------------|---------|--------|---------|------|
| `enter_story_archive_page` | 新增参数 | `tab_name` | 进入时 landing 的 tab | `calendar_tab`, `story_tab`, `thought_tab` |
| `shoot` | 新增参数 | `story_archive_tab_name` | Story Archive 的 tab name | `story_tab`, `thought_tab` |

## 7. AB Testing Setup (AB 测试配置) (Optional)
*如果此需求需要 AB 测试，请填写此部分；否则可删除或标注 "N/A"*
*   **实验组配置:**
| 组别 | 流量分配 | 功能描述 | 备注 |
|------|---------|---------|------|
| v1 (Control) | [例如: 5%] | [对照组行为描述] | 保持现有逻辑 |
| v2 | [例如: 5%] | [实验组 1 行为描述] | [例如: 仅启用功能 A] |
| v3 | [例如: 5%] | [实验组 2 行为描述] | [例如: 启用功能 A + B] |

## 8. Constraints (约束与规范)
*   **Navigation:** 使用 `ARouter` (Android) / `Coordinator` (iOS)。
*   **Images:** 必须使用 `Glide` 加载。
*   **Theme:** 颜色请引用 `R.color.brand_primary`。
*   **xx规范** 可参照文件xxx (绝对路径)