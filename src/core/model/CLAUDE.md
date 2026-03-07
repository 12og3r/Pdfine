# core/model

## Purpose
Document data model factory functions and query/manipulation utilities. Self-contained — no dependencies on other core modules.

## Files

### DocumentModel.ts
Factory functions for creating immutable model objects.
- `createDocumentModel(metadata, pages)` — root document with empty fonts Map
- `createPageModel(index, width, height)` — page with empty elements, dirty=false
- `createTextBlock(paragraphs, bounds, editable)` — auto-generated ID (`tb-{timestamp}-{counter}`), tracks originalBounds
- `createParagraph(runs, alignment?, lineSpacing?)` — defaults: left-aligned, 1.2 spacing
- `createTextRun(text, style)`, `createTextStyle(partial)` — style defaults: 400 weight, normal, black
- `createImageElement(bounds, imageData, mimeType)` — ID prefix `img-`
- `createPathElement(commands, bounds, ...)` — ID prefix `path-`

IDs use global counter + timestamp for uniqueness.

### ModelOperations.ts
Query and manipulation utilities.
- `findTextBlock(page, blockId)` / `findElement(page, elementId)` — linear search
- `getPlainText(block)` — concatenated text with newlines between paragraphs
- `getTextOffset(block, paragraphIdx, runIdx, charIdx)` — absolute character offset
- `setTextAtOffset(block, offset, length, newText)` — text replacement across runs/paragraphs (**mutates block**)

## Data Hierarchy
```
DocumentModel → pages[] → elements[] → TextBlock → paragraphs[] → runs[] → style
                                      → ImageElement
                                      → PathElement
                        → fonts Map<string, RegisteredFont>
```

## Dependencies
- `types/document` — all type definitions (DocumentModel, PageModel, TextBlock, etc.)

## Developer Notes
- Factories copy bounds with spread (`{ ...bounds }`) but don't deep-clone complex structures
- `setTextAtOffset` is mutation-based (modifies block in place)
- Text offset model: newlines between paragraphs count as 1 character each
- Always check `el.type` before casting PageElement (discriminated union)
