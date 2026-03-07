# User Hooks

This directory allows you to create custom workflow hooks that execute at specific points in the AI SDE workflow.

## Directory Structure

```
user-hooks/
├── requirements/
│   ├── pre.md    # Runs before requirements phase
│   └── post.md   # Runs after requirements phase
├── design/
│   ├── pre.md    # Runs before design phase
│   └── post.md   # Runs after design phase
├── tasks/
│   ├── pre.md    # Runs before tasks phase
│   └── post.md   # Runs after tasks phase
└── implementation/
    ├── pre.md    # Runs before implementation phase
    └── post.md   # Runs after implementation phase
```

## How Hooks Work

1. **Pre-hooks** execute before the corresponding workflow phase begins
2. **Post-hooks** execute after the workflow phase completes successfully
3. Hooks are executed synchronously - the workflow waits for completion

## Creating a Hook

1. Create the appropriate subdirectory (e.g., `requirements/`)
2. Create a `pre.md` or `post.md` file with instructions
3. The hook file should contain markdown instructions that the AI will execute

## Example Hook

```markdown
# Pre-Requirements Hook

## Instructions
1. Check if there are any existing requirements in the `docs/` folder
2. Summarize any relevant context from previous feature implementations
3. Report findings before proceeding with requirements generation
```

## Notes

- Hooks are optional - only create them if you need custom workflow behavior
- Hook execution is delegated to a subagent for isolation
- Location controlled by `userCustomDir` in `.ai-sde/config.toml`
