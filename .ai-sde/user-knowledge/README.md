# User Knowledge

This directory allows you to add custom knowledge documents that supplement the system knowledge base.

## Purpose

User knowledge documents provide additional context and information specific to your project that the AI SDE workflow can reference during spec creation and implementation.

## Difference from System Knowledge

- **System Knowledge** (`.ai-sde/knowledge/`): Contains standard guides and documentation
- **User Knowledge** (this directory): Your custom project-specific knowledge

## Suggested Documents

You can add any markdown documents relevant to your project, such as:

- `coding-standards.md` - Project-specific coding conventions
- `architecture-decisions.md` - ADRs and design decisions
- `api-contracts.md` - API specifications and contracts
- `testing-guidelines.md` - Testing requirements and patterns
- `deployment-notes.md` - Deployment procedures and considerations

## Usage

1. Create markdown files in this directory
2. The AI SDE workflow will include these in the available resources
3. Reference them in your workflow as needed

## Notes

- All `.md` files in this directory are available as resources
- Location controlled by `userCustomDir` in `.ai-sde/config.toml`
