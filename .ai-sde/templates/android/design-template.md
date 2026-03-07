# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/requirements.md`

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Figma Design & D2C Integration

### CRITICAL: Figma Design Integration Requirement

**This section is MANDATORY when Figma designs are provided in the requirements.**

#### Design Resources
- **Figma URLs**: [List ALL Figma design URLs from requirements]
  - [URL 1 - e.g., Main Screen UI]
  - [URL 2 - e.g., Detail Screen UI]
- **D2C Tool**: `common-plugin:figma-to-xml` subagent
- **Target Framework**: Android XML layouts with TUX design system

#### D2C Workflow Integration
1. **Design Phase Capture**: Document all Figma URLs and visual specifications
2. **UI Generation**:
   - MUST use `common-plugin:figma-to-xml` subagent to generate TUX-based XML layouts
   - Specify target module directory path where code should be generated
   - Provide Figma URL: [insert figma link here]
   - **IMPORTANT**: Use the `common-plugin:figma-to-xml` subagent, do NOT directly use d2c4a MCP tools
3. **Android Component Integration**:
   - Generate XML layouts with TUX components only (NO native Android components)
   - ALL UI elements MUST use TUX library components (consult `tiktok-plugin:tux` skill)
   - Implement business logic in Kotlin
   - Ensure 100% compliance with TUX UI specifications
4. **Validation**: Ensure generated XML layouts with TUX components match Figma specifications exactly

#### UI Components to Generate
[List each UI component that needs D2C generation]
- Component 1: [Name] - Figma URL: [URL] - Module: [Target module path]
- Component 2: [Name] - Figma URL: [URL] - Module: [Target module path]

### Implementation Notes
- Never manually code UI components when Figma designs are provided
- MUST use `common-plugin:figma-to-xml` subagent for code generation
- **TUX UI Guidelines (CRITICAL)**:
  - ALL UI components MUST use TUX components from the TikTok UI library
  - NEVER use native Android components (e.g., `android.widget.Button`, `TextView`, `EditText`)
  - Consult `tiktok-plugin:tux` skill when creating or modifying ANY UI Views in XML layouts or Kotlin/Java code
  - TUX is the standard UI component library for TikTok Android project - no exceptions
- Generated XML layouts should be reviewed for TUX compliance before business logic integration
- Business logic implemented in Kotlin
- Maintain clear separation: UI layer (XML + TUX) + logic layer (ViewModel + Kotlin)

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]  
**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]  
**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]  
**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]  
**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]
**Project Type**: [single/web/mobile - determines source structure]  
**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]  
**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]  
**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

[Gates determined based on constitution file]

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── requirements.md       # User stories and functional requirements
├── design.md            # This file - technical design and architecture
├── tasks.md             # Implementation tasks (to be created)
└── events.jsonl         # Event log (auto-created)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |