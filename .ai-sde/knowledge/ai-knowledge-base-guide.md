# AI SDE Knowledge Base Guide

## ⚠️ CRITICAL: Read This First
**This document is META-KNOWLEDGE** - it teaches AI how to find and use actual project knowledge.

**MANDATORY READING ORDER during Context Refresh:**
1. **First**: Read this guide completely to understand the knowledge base system
2. **Second**: Identify target modules from user spec or requirements
3. **Third**: Read module knowledge files following the phase-specific order below

Failure to follow this order will result in incomplete context and poor-quality specifications.

## Purpose
This guide provides instructions for Large Language Models (LLMs) operating in Claude sessions on how to properly utilize the knowledge base system within the AI SDE workflow.
### 
## Knowledge Base Structure 
#### CLAUDE.md Files
- reside in the module directory
- contain exactly three sections:
  - Module Overview: Brief description of the module's primary purpose and responsibilities
  - Key or Entry Classes: Important classes/interfaces with one-line descriptions
  - References: Fixed references to specific documentation files
        - `interface.md`: External interfaces and public APIs exposed by the module
        - `workflow.md`: Business process flows and integration diagrams
        - `domain.md`: Business terminology and strategy documentation
        - `rule.md`: Code style, architecture, and naming conventions
  
## AI SDE Workflow Integration

### Module Discovery

1. **Identify target modules** from user prompt, spec, or by activating CLAUDE SKILL domain-code-map
2. **Read target module's `CLAUDE.md`** — it provides module overview, key classes, and references to detailed docs
3. **Check for sub-modules**: If the requirement clearly involves specific sub-modules within the target module, look for `CLAUDE.md` files in sub-module directories as well. Sub-module knowledge helps produce more accurate and context-aware artifacts.
   - Example: if the target is `TikTokSocial` but the feature specifically touches `Archive/StoryList`, also read `Archive/StoryList/CLAUDE.md` if it exists

### Phase-Specific Reading Order

- Phase 1: Requirements (before creating `requirements.md`): read target modules' `CLAUDE.md`, then `domain.md` (business terminology/strategy) and `workflow.md` (business process flows)
- Phase 2: Design (before creating `design.md`): read target modules' `CLAUDE.md`, then `workflow.md` (process flows) and `rule.md` (code style/architecture/naming)
- Phase 3: Tasks (before creating `tasks.md`): read target modules' `CLAUDE.md`, then `workflow.md` (process flows) and `rule.md` (code style/architecture/naming)
- Phase 4: Implementation: refer to target modules' `CLAUDE.md`, `workflow.md` and `rule.md` while coding

### When to Use Which Documentation
- For module understanding: Start with `CLAUDE.md` → check referenced files → check sub-module `CLAUDE.md` if relevant
- For business terminology: Consult `domain.md`
- For code generation: Follow `rule.md` and check `.claude/rules/`
- For specific tasks: Look for relevant SKILL files




