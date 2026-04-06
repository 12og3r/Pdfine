# core/editor

## Purpose
Text editing engine — manages editing lifecycle, input handling, cursor/selection tracking, command-based undo/redo, and IME composition.

## Files

### EditEngine.ts
Central orchestrator implementing `IEditEngine`. Facade coordinating all sub-managers.
- Edit mode lifecycle: `enterEditMode(blockId)` / `exitEditMode()`
- Routes input events to InputHandler/ImeHandler
- Handles keyboard shortcuts (arrows, Ctrl+Z/Y, Ctrl+B/I). Enter exits edit mode (confirms edits); Shift+Enter inserts a newline via `inputHandler.handleInsertNewline()`; Escape also exits edit mode.
- Emits events: editStart, editEnd, textChanged, styleAtCursor, historyChanged

### CursorManager.ts
Tracks cursor position (pageIdx, blockId, charOffset) and handles navigation.
- `moveCursor(direction)` — left/right/up/down character movement
- `moveWordLeft/Right()`, `moveToLineStart/End()` — word/line navigation
- `getCursorPosition()` — returns screen coordinates using glyph layout data
- Emits `cursorMoved` on every position change
- Vertical movement preserves X position by finding closest glyph
- **Offset accounting**: `getGlyphAtOffset()`, `findCurrentLine()`, `moveVertical()` all account for `\n` between paragraphs AND `\n` within runs (inter-line breaks from PDF parsing) to stay consistent with `getTextContent()` / `getRunAtOffset()`
- Helper methods: `countNewlinesInRuns()`, `getParaTextLength()`, `getLineOffsetRanges()` compute text-offset-aware line boundaries

### SelectionManager.ts
Manages text selection ranges within a single block.
- Selection always normalized (startOffset < endOffset)
- `extendSelection()` for Shift+arrow key selection
- Emits `selectionChanged`

### InputHandler.ts
Bridges browser `beforeInput` events to edit commands.
- Translates inputType → EditCommand (INSERT_TEXT, DELETE_TEXT, etc.)
- Handles: insertText, insertLineBreak, deleteContentBackward/Forward, deleteWord*, insertFromPaste
- Skips input during IME composition
- Calls `breakMerge()` after spaces/newlines

### ImeHandler.ts
IME composition handling for CJK input.
- Lifecycle: compositionstart → compositionupdate → compositionend
- Text applied only on compositionend (intermediate updates are preview-only)
- Safari workaround: `ignoreNextInput` flag prevents double-insertion
- Deletes existing selection on composition start

### CommandHistory.ts
Undo/redo stack using Command Pattern.
- `push(command)` — applies immediately via `applyCommand()`, clears redo stack
- Merge logic: consecutive INSERT_TEXT within 500ms, same block, contiguous offsets, no spaces/newlines
- `breakMerge()` prevents unwanted merging
- Emits `historyChanged` with canUndo/canRedo

### EditCommands.ts
Command execution and inversion logic. All text model mutations happen here.
- `applyCommand(command, pages)` — mutates TextBlock paragraphs/runs
- `inverseCommand(command)` — generates reverse operation for undo
- `getRunAtOffset(block, offset)` — locates run for global character offset
- Handles paragraph splitting (newlines) and merging (cross-paragraph deletes)
- Supports: INSERT_TEXT, DELETE_TEXT, REPLACE_TEXT, CHANGE_STYLE, BATCH
- Maintains `pdfCharWidths` array consistency: splices on insert (NaN for new chars), delete, and run splitting

### index.ts
Barrel exports for public API.

## Data Flow
```
Browser event → EditEngine → InputHandler/ImeHandler → EditCommand
→ CommandHistory.push() → applyCommand() → TextBlock mutation
→ CursorManager.setCursor() → EventBus('textChanged') → Layout + Render
```

## Text Offset Model
Global offset = sum of characters in earlier paragraphs + 1 per paragraph boundary (newline).

## Dependencies
- `types/document` — EditCommand, TextBlock, TextStyle, PageModel
- `types/ui` — CursorPosition, SelectionRange
- `config/constants` — CONTINUOUS_INPUT_MERGE_INTERVAL_MS
- `infra/EventBus` — event emission
- `interfaces/IEditEngine` — interface contract

## Developer Notes
- Commands are applied immediately on push (no lazy evaluation)
- Set cursor position AFTER command push (text shifts offsets)
- Edit mode is single-block only
- CursorManager needs populated layout data (LayoutEngine must run first)
- Empty blocks always keep 1 paragraph with 1 empty run
- Merge is aggressive — check `breakMerge()` calls if undo grouping is wrong
- **CRITICAL: Offset consistency** — All code iterating through glyphs MUST account for `\n` between paragraphs (`if (pi > 0) globalIdx++`) AND `\n` within runs (inter-line breaks that have no glyphs) to match `getTextContent()`'s offset space. HitTester, CursorManager, and SelectionRenderer all do this by walking through run text and skipping `\n` characters when matching glyphs.
