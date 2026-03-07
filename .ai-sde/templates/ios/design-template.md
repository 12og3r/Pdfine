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
  - [URL 1 - e.g., Story Tab UI]
  - [URL 2 - e.g., Thought Tab UI]
- **D2C Tool**: `tiktok_d2c_mcp`
- **Target Framework**: TTKC Component with TUX design system

#### TUX Component Constraints

**IMPORTANT: If the spec explicitly defines TUX component constraints (e.g., must use `TUXIntroPanel`), you must follow them strictly in the implementation.**

- **Component Constraints**: [e.g., must use `TUXIntroPanel` / no constraints]

#### D2C Workflow Integration
1. **Design Phase Capture**: Document all Figma URLs and visual specifications
2. **UI Generation**: MUST use D2C tool to generate TUX-based UI components
3. **Constraint Validation**:
   - **Check whether the D2C output complies with the TUX component constraints in the spec**
   - If the constraints are not met or the output quality is poor:
     - Search the project for an existing implementation of the TUX component (e.g., search for `TUXIntroPanel`)
     - Refer to the TUXExample demo code (e.g., `Modules/TUXExample/.../TUXIntroPanelDemoController.swift`)
     - Manually implement using the TUX component directly
4. **TTKC Component Integration**:
   - Create TTKC components following componentization requirements
   - Use generated TUX code directly for UI parts within TTKC components
   - Implement business logic layer using TTKC patterns
   - Ensure proper data flow and state management
5. **Validation**: Ensure TTKC components with integrated TUX UI match Figma specifications exactly

#### UI Components to Generate
[List each UI component that needs D2C generation]
- Component 1: [Name] - Figma URL: [URL] - File: [Target file path]
- Component 2: [Name] - Figma URL: [URL] - File: [Target file path]

### Implementation Notes
- Never manually code UI components when Figma designs are provided
- MUST use D2C tool to generate TUX-based UI components
- Generated TUX UI code should be used directly within TTKC components
- TTKC components handle business logic, state management, and data flow
- Maintain clear separation: UI layer (TUX) + business logic layer (TTKC)

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
