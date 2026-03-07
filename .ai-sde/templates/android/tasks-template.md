# Tasks Document

<!--
NOTE: Group related small changes into single tasks to avoid excessive review interruptions.
Each task should represent a meaningful unit of work (e.g., "Implement Data Layer" rather than "Create File X").
-->

- [ ] 1. Define Data Models & Types
  - Dependencies: None
  - File: app/src/main/java/com/example/app/model/FeatureData.kt
  - Description: Define Kotlin data classes for the feature
  - Purpose: Establish type safety and data structure contracts
  - _Leverage: app/src/main/java/com/example/app/model/BaseData.kt_
  - _Requirements: 1.0_
  - <!-- _Prompt:
    Role: Client Development Engineer
    Task: Create comprehensive Kotlin data classes for the feature data structures following requirement 1.0, extending existing base classes
    Restrictions: Maintain backward compatibility, follow project naming conventions
    Success: All classes compile without errors, proper inheritance from base types
    Control Flow: After completion mark [x] and proceed to the next task. -->

- [ ] 2. Implement Data Access Layer
  - Dependencies: 1
  - File: app/src/main/java/com/example/app/repository/FeatureRepository.kt
  - Description: Implement data fetching and state management logic
  - Purpose: Handle data fetching and state synchronization
  - _Leverage: app/src/main/java/com/example/app/network/NetworkClient.kt_
  - _Requirements: 2.0_
  - <!-- _Prompt:
    Role: Client Development Engineer
    Task: Implement data fetching and state management logic following requirement 2.0, using existing network client
    Restrictions: Handle loading and error states, ensure thread safety
    Success: Data fetching works correctly, state is updated properly, errors are handled gracefully
    Control Flow: After completion mark [x] and proceed to the next task. -->

- [ ] 3. Build UI Components (Android) with Figma Integration
  - Dependencies: 1
  - File: app/src/main/res/layout/fragment_feature.xml
  - Description: Generate TUX-based XML layouts from Figma designs using D2C workflow
  - Purpose: Build XML layouts with TUX components that exactly match Figma specifications
  - Implementation Workflow:
    1. **D2C Generation (REQUIRED when Figma URL is provided)**:
      - Tool: Use `common-plugin:figma-to-xml` subagent
      - Input:
        - Figma design URL from requirements
        - Target module directory path (e.g., `components/feature-module`)
      - Process:
        - Call `common-plugin:figma-to-xml` subagent with Figma URL and module path
        - Subagent handles all D2C workflow steps internally (download, parse, generate, optimize)
        - Generates TUX-based XML layouts automatically
      - Output: Generated XML layout files in target module's `res/layout/` directory
      - **CRITICAL**: Use the `common-plugin:figma-to-xml` subagent - do NOT directly use d2c4a MCP tools
    2. **Review Generated XML**:
      - Read and review generated XML layout files
      - Verify ALL UI components use TUX library (NO native Android components)
      - Ensure visual match with Figma specifications
      - The generated XML will serve as the UI foundation for business logic integration
    3. **Business Logic Integration** (Next Task - Task 4):
      - ViewModels, data binding, and business logic will be implemented in Task 4
      - Generated XML layouts provide the TUX-compliant UI layer
      - Follow MVVM architecture patterns for clear separation
  - _Leverage: `common-plugin:figma-to-xml` subagent, TUX design system, `tiktok-plugin:tux` skill_
  - _Requirements: 3.0_
  - <!-- _Prompt:
    Role: Android Client Development Engineer
    Task: Implement the task for spec {spec-name}, first run spec-workflow-guide to get the workflow guide then implement the task: Generate TUX-based XML layouts using `common-plugin:figma-to-xml` subagent for each Figma URL. Provide the Figma URL and target module path to the subagent. Review generated XML to ensure ALL components use TUX library (consult `tiktok-plugin:tux` skill). The generated XML will be used in Task 4 for business logic integration.
    Restrictions: MUST use `common-plugin:figma-to-xml` subagent. NEVER directly use d2c4a MCP tools. ALL UI components MUST use TUX library - NO native Android components (e.g., android.widget.Button, TextView).
    Success: TUX-based XML layouts generated successfully, visual match with Figma confirmed, ready for business logic integration in Task 4
    Control Flow: After completion mark [x] and proceed to the next task. -->

- [ ] 4. Integrate Feature Logic with Generated UI
  - Dependencies: 2, 3
  - File: app/src/main/java/com/example/app/ui/feature/FeatureFragment.kt
  - Description: Implement business logic and state management that integrates with generated TUX-based XML layouts from Task 3
  - Purpose: Add business logic, UI binding, and state management to the generated UI components
  - Implementation Workflow:
    1. **Architecture & State Management**:
      - Follow existing architecture patterns in the codebase (e.g., Assem, ALS, or other patterns)
      - Implement state management using the project's standard approach
      - Handle user interactions and data updates
    2. **UI Integration**:
      - Connect business logic to generated XML layouts from Task 3
      - Use project-standard approaches for view access and binding
      - Implement click listeners and event handlers
    3. **Business Logic Implementation**:
      - Integrate with repositories from Task 2
      - Implement navigation logic using Router (consult `tiktok-plugin:router` skill)
      - Add event tracking using Applog (consult `tiktok-plugin:applog-event-tracking` skill)
      - Handle loading and error states
  - _Leverage: Generated TUX XML layouts from Task 3, existing architecture patterns, `tiktok-plugin:router` skill, `tiktok-plugin:applog-event-tracking` skill_
  - _Requirements: 4.0_
  - <!-- _Prompt:
    Role: Android Client Development Engineer
    Task: Implement the task for spec {spec-name}, first run spec-workflow-guide to get the workflow guide then implement the task: Implement business logic and state management that integrates with the generated TUX-based XML layouts from Task 3. Follow existing architecture patterns in the codebase (Assem, ALS, or others). Handle user interactions, navigation (consult `tiktok-plugin:router` skill), and event tracking (consult `tiktok-plugin:applog-event-tracking` skill).
    Restrictions: Use generated XML from Task 3 as-is for UI layer. Follow existing code patterns and architecture. Ensure proper lifecycle management.
    Success: Business logic correctly connects to UI, user interactions work properly, navigation flows are correct, events are tracked
    Control Flow: After completion mark [x] and proceed to the next task. -->

- [ ] 5. Integration, Verification & Code Review
  - Dependencies: 4
  - File: Multiple (UI and Integration files)
  - Description: Integrate the feature, review code, and verify functionality.
  - Purpose: Ensure quality, correctness, and compilation stability through integration and review.
  - Implementation Workflow:
    1. **Integration**:
      - Register components in navigation graph or activity
      - Update ViewModels to include new feature logic
      - Ensure proper data flow and dependency injection
    2. **Code Review & Fix**:
      - Review implementation against requirements and design goals
      - Check for and auto-fix any compilation errors
    3. **Validation**:
      - Verify visual match with design specs
      - Verify user interactions and navigation flows
      - Verify data binding, state updates, and error handling
      - Verify accessibility features and performance
  - _Leverage: app/src/main/java/com/example/app/ui/base/BaseFragment.kt_
  - _Requirements: All_
  - <!-- _Prompt:
    Role: Client Development Engineer
    Task: 1. Integrate the feature into the app navigation and dependency graph. 2. Perform a comprehensive code review against requirements and design goals, auto-fixing any compilation issues. 3. Review code to ensure it supports all UI interactions, accessibility, and performance requirements.
    Restrictions: Ensure code quality, compilation correctness, and smooth integration.
    Success: Feature is integrated, code is clean and compiles without errors, and logic supports all requirements.
    Control Flow: After completion mark [x] and proceed to the next task. -->
