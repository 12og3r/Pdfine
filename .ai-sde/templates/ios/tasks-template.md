# Tasks Document

<!--
NOTE: Group related small changes into single tasks to avoid excessive review interruptions.
Each task should represent a meaningful unit of work (e.g., "Implement Data Layer" rather than "Create File X").
-->

- [ ] 1. Define Data Models & Types
  - Dependencies: None
  - File: Modules/{ModuleName}/{ModuleName}/Classes/Model/{Feature}DataModel.swift
  - Description: Define Swift data models and types for the feature
  - Purpose: Establish type safety and data structure contracts in Swift
  - _Leverage: Modules/{ModuleName}/{ModuleName}/Classes/Model/BaseDataModel.swift_
  - _Requirements: 1.0_
  - <!-- _Prompt:
    Role: iOS Client Development Engineer
    Task: Create comprehensive Swift data models and types for the feature data structures following requirement 1.0, extending existing base classes or protocols
    Restrictions: Maintain backward compatibility, follow Swift naming conventions, use Codable for JSON serialization
    Success: All models compile without errors, proper inheritance from base types, JSON serialization works correctly
    Control Flow: After completion mark [x] and proceed to the next task. -->

- [ ] 2. Implement Data Access Layer
  - Dependencies: 1
  - File: Modules/{ModuleName}/{ModuleName}/Classes/Service/{Feature}Service.swift
  - Description: Implement data fetching and state management logic
  - Purpose: Handle data fetching, caching, and state synchronization
  - _Leverage: Modules/{ModuleName}/{ModuleName}/Classes/Service/NetworkService.swift_
  - _Requirements: 2.0_
  - <!-- _Prompt:
    Role: iOS Client Development Engineer
    Task: Implement data fetching and state management logic following requirement 2.0, using existing network service patterns
    Restrictions: Handle loading and error states, ensure thread safety with DispatchQueue/actors, implement proper caching
    Success: Data fetching works correctly, state is updated properly, errors are handled gracefully, no memory leaks
    Control Flow: After completion mark [x] and proceed to the next task. -->

- [ ] 3. Build UI Components (iOS) with Figma Integration
  - Dependencies: 1
  - Description: Generate TUX UI components from Figma designs and integrate into TTKC components
  - Purpose: Build TTKC components that use generated TUX UI to exactly match Figma specifications
  - Implementation Workflow:
    1. **D2C Generation (REQUIRED when Figma URL is provided)**:
      - Collect all Figma URLs from requirements/design docs
      - **If multiple Figma URLs exist, process them sequentially in order** — call D2C MCP for each URL one by one, complete the full workflow for one before starting the next
      - For each Figma URL:
        - Derive a **custom prompt** from the corresponding requirement/design context for this component (e.g., specific layout constraints, interaction behavior, state variations, or styling rules relevant to this UI piece)
        - Call the D2C MCP tool with two parameters:
          - `figmaUrl`: the Figma URL
          - `customPrompt`: the derived requirement context to guide generation
        - **Follow the complete D2C MCP workflow exactly as instructed by the tool**
        - The D2C MCP will handle all generation, optimization, and validation steps automatically
        - Output: Optimized TUX-based Swift UI code for that component
    2. **Constraint Validation** (per generated component):
      - **Check whether the D2C output complies with the TUX component constraints in `design.md`**
      - If the constraints are not met or the output quality is poor:
        - Search the project for an existing implementation of the TUX component (e.g., search for `TUXIntroPanel`)
        - Read the TUXExample demo code (e.g., `Modules/TUXExample/.../TUXIntroPanelDemoController.swift`)
        - Manually implement the TUX component configuration according to the Figma design
    3. **Extract Generated Code**:
      - Extract the optimized TUX code from each D2C output or manual implementation
      - The generated code will be integrated directly into TTKC components
  - _Leverage: tiktok_d2c_mcp tools (complete workflow), TUX design system, TUXExample demo code_
  - _Requirements: 3.0_
  - <!-- _Prompt:
    Role: iOS Client Development Engineer
    Task: Implement the task for spec {spec-name}, first run spec-workflow-guide to get the workflow guide then implement the task: Step 1) Collect all Figma URLs from requirements/design. If multiple URLs exist, process them sequentially in order — complete one D2C workflow fully before starting the next. Step 2) For each URL, derive a custom prompt from the relevant requirement/design context (layout constraints, interaction behavior, state variations, styling rules), then call D2C MCP tool with both figmaUrl and customPrompt parameters and follow its complete workflow. Step 3) Validate each output against TUX component constraints in `design.md`; if constraints are not met, search existing implementations and use TUXExample as reference to implement manually. Step 4) Extract and prepare all UI code for the next task.
    Restrictions: Must call D2C MCP tool for each Figma URL with both figmaUrl and customPrompt parameters. Must process multiple URLs sequentially in order, not in parallel. Must validate constraints after each D2C. If constraints are not met, must search existing implementations.
    Success: UI components are implemented, constraints are satisfied, and visuals match the Figma design.
    Control Flow: After completion mark [x] and proceed to the next task. -->

- [ ] 4. Create TTKC Components
  - Dependencies: 2, 3
  - File: Modules/{ModuleName}/{ModuleName}/Classes/Component/{Feature}Component.swift
  - Description: Create TTKC components that wrap generated TUX UI with business logic
  - Purpose: Implement reusable UI components following TikTok's component architecture
  - Implementation Workflow:
    1. **TTKC Component Creation**:
      - Create component following TTKC patterns (@TTKCComponent, ViewComponent)
      - Use generated TUX UI code from task 3 directly as view layer
      - Implement required protocols (Reusable, etc.)
    2. **Business Logic Implementation**:
      - Add gesture handling for user interactions
      - Integrate with navigation and module services
      - Implement event tracking using EventTrackingUtils
    3. **Dependency Injection**:
      - Inject required protocols and services
      - Setup proper binding for data flow
      - Implement updateWithItemID method for data binding
  - _Leverage: Generated TUX UI from task 3, existing TTKC component patterns, dependency injection framework_
  - _Requirements: 4.0_
  - <!-- _Prompt:
    Role: iOS Client Development Engineer
    Task: Implement the task for spec {spec-name}, first run spec-workflow-guide to get the workflow guide then implement the task: Create TTKC components that integrate the generated TUX UI from task 3. Implement gesture handling, navigation, event tracking, and dependency injection patterns. Follow TTKC component architecture exactly.
    Restrictions: MUST use generated TUX UI code from task 3 as-is for view layer. Must follow TTKC component patterns exactly.
    Success: Components display correctly with TUX UI, handle interactions properly, integrate with navigation system
    Control Flow: After completion mark [x] and proceed to the next task. -->

- [ ] 5. Integration, Verification & Code Review
  - Dependencies: 4
  - File: Multiple (Integration files)
  - Description: Integrate components, review code, and verify functionality.
  - Purpose: Ensure end-to-end functionality, visual quality, and code correctness.
  - Implementation Workflow:
    1. **Integration**:
      - Register components in collection views or navigation flows
      - Update view models to include new components
      - Ensure proper data flow to components
    2. **Code Review & Fix**:
      - Review implementation against requirements and design goals
      - Check for and auto-fix any compilation errors
    3. **Validation**:
      - Verify visual match with Figma designs
      - Verify user interactions and navigation flows
      - Verify data binding and state updates
      - Test accessibility features and performance (responsiveness)
  - _Leverage: Existing integration patterns, EventTrackingUtils_
  - _Requirements: All functional and visual requirements_
  - <!-- _Prompt:
    Role: iOS Client Development Engineer
    Task: Implement the task for spec {spec-name}, first run spec-workflow-guide to get the workflow guide then implement the task: Integrate components into existing flows. Perform a comprehensive code review against requirements/design and auto-fix any compilation issues. Verify code supports visual match, interactions, and accessibility.
    Restrictions: Must cover all functional requirements. Must ensure code compiles and is correct.
    Success: Components integrate seamlessly, code is reviewed and fixed, and logic supports requirements.
    Control Flow: After completion mark [x] and proceed to the next task. -->

- [ ] 6. Build & Verify (Xcode Build Agent)
  - Dependencies: 5
  - File: Xcode build output (no code changes expected)
  - Description: Use Xcode build skill (which internally calls xcode build agent) to run a build and verify compilation.
  - Purpose: Catch integration/compile issues before release; the build must be executed.
  - Implementation Workflow:
    1. **Load Xcode Build Skill**:
      - First, invoke Skill(skill-name: "tiktok-infra:xcode-build-skill") to load the build skill
      - The skill will provide instructions to run the build-workflow.sh script in the background
      - Follow the skill instructions exactly (run the build script with appropriate parameters)
    2. **Execute Build**:
      - Run the build-workflow.sh script as instructed by the skill (must run in background)
      - Must execute even if it is slow
      - Monitor the build output continuously
      - Provide progress updates (start, in-progress, finish/fail)
    3. **Handle Build Errors**:
      - CRITICAL: Use grep to search the ENTIRE build output for errors, do NOT rely only on tail
      - Search for errors in this order using grep:
        a. `grep -n "errors generated"` - Swift/ObjC compilation error summary
        b. `grep -n "fatal error:"` - Fatal compilation errors (file not found, syntax errors)
        c. `grep -n "\.swift.*error:"` - Swift-specific errors
        d. `grep -n "\.m.*error:\|\.h.*error:"` - Objective-C errors
        e. `grep -n "ERROR:"` - Bazel/linker errors
      - For each error found, use `grep -A 10 -B 10` to see context (10 lines before/after)
      - Analyze error messages systematically:
        a. Search for similar patterns in nearby files
        b. Expand search to nearby folders
        c. Continue expanding to search the project
        d. Check protocol implementations if functions are missing
      - Fix issues following proper practices:
        - DO NOT add extra variables or comments just to make it compile
        - DO NOT hallucinate or create solutions without verification
        - Fix the issue in a straightforward way that follows project patterns
        - Ensure the fix aligns with task requirements and design goals
    4. **Re-run Build After Fixes**:
      - After fixing issues, re-run the build to verify the fix
      - Some errors are caused by earlier errors, so rebuild after each fix
      - Report what was fixed and why
  - _Leverage: Xcode build skill (tiktok-infra:xcode-build-skill), build-workflow.sh script, tiktok_arch_mcp tools_
  - _Requirements: All functional requirements compile successfully_
  - <!-- _Prompt:
    Role: iOS Client Development Engineer
    Task: Implement the task for spec {spec-name}, first run spec-workflow-guide to get the workflow guide then implement the task: Step 1) Load Xcode build skill using Skill(skill-name: "tiktok-infra:xcode-build-skill"). Step 2) Follow the skill instructions to run build-workflow.sh in background. Step 3) Monitor build progress and provide updates. Step 4) If build fails, use grep to search the ENTIRE build output (DO NOT use only tail): a) grep -n "errors generated", b) grep -n "fatal error:", c) grep -n "\.swift.*error:", d) grep -n "\.m.*error:\|\.h.*error:", e) grep -n "ERROR:". For each error, use grep -A 10 -B 10 to see context. Step 5) Fix errors by systematically searching for similar patterns (nearby files, nearby folders, project-wide). DO NOT add extra variables/comments just to compile. Fix issues following project patterns and task requirements. Step 6) Re-run build after each fix to verify. Report what was fixed and why.
    Restrictions: Must load Xcode build skill first. CRITICAL: Must use grep to search entire build output, not just tail. Must search for multiple error patterns (errors generated, fatal error, etc.). Must use grep -A/-B for context. Must fix errors properly following project patterns, not just to make it compile. Must re-run build after fixes. Do not delegate build to another agent.
    Success: Build completes successfully with all errors properly fixed following project patterns and task requirements
    Control Flow: After completion mark [x] and proceed to the next task. -->
