# config

## Purpose
Centralized constants and default values. Single source of truth for tunable parameters.

## Files

### constants.ts
Algorithmic and rendering constants.

**Text Aggregation** (controls how raw text items are grouped into blocks):
- `LINE_SPACING_THRESHOLD = 1.8` — paragraph separation
- `SAME_LINE_Y_THRESHOLD = 0.3` — baseline alignment tolerance
- `CHAR_GAP_THRESHOLD = 0.3` — max gap between characters

**Overflow Handling**:
- `OVERFLOW_TOLERANCE_PERCENT = 15` — auto-shrink trigger threshold
- `MIN_LINE_SPACING = 1.0`, `MAX_LETTER_SPACING_REDUCTION = 0.05`, `MAX_FONT_SIZE_REDUCTION_PT = 3`

**Performance**:
- `CONTINUOUS_INPUT_MERGE_INTERVAL_MS = 500` — undo merge window
- `DIRTY_RECT_PADDING = 10`

**Zoom**: `MIN_ZOOM = 0.25`, `MAX_ZOOM = 5.0`, `ZOOM_STEP = 0.1`, `DEFAULT_ZOOM = 1.0`

**Rendering**:
- `CURSOR_BLINK_INTERVAL_MS = 530`
- Colors: `SELECTION_COLOR` (indigo 30%), `CURSOR_COLOR` (#1F2937), `EDIT_BORDER_COLOR` (#6366F1), `OVERFLOW_BORDER_COLOR` (#F59E0B), `TEXT_HOVER_BG_COLOR` (indigo 8%), `TEXT_EDITING_BG_COLOR` (indigo 12%)
- `PAGE_GAP = 20`, `PAGE_MARGIN = 40`

### defaults.ts
User-facing default values.
- `DEFAULT_TEXT_STYLE` — fontId: 'default-sans', 12pt, weight 400, normal style, black
- `DEFAULT_LINE_SPACING = 1.2`, `DEFAULT_ALIGNMENT = 'left'`
- `FALLBACK_FONTS` — [Arial, Helvetica, Times New Roman, Georgia, Courier New, sans-serif, serif, monospace]
- `DEFAULT_NEW_TEXTBLOCK_WIDTH = 200`, `DEFAULT_NEW_TEXTBLOCK_HEIGHT = 50`

## Developer Notes
- `constants.ts` = algorithmic tuning; `defaults.ts` = user-facing defaults
- Text aggregation thresholds directly affect parsing quality — increasing makes grouping more aggressive
- Fallback font order matters — first available font wins
- All colors use hex or rgba format consistently
