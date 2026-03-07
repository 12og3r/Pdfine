# User Templates

This directory allows you to create custom templates that override the default AI SDE Workflow templates.

## How to Use Custom Templates

1. **Create your custom template file** in the platform directory with the exact same name as the default template you want to override:
   - `android/requirements-template.md` - Override Android requirements document template
   - `android/design-template.md` - Override Android design document template
   - `android/tasks-template.md` - Override Android tasks document template
   - `android/spec-template.md` - Override Android PRD-to-spec document template
   - `android/product-template.md` - Override Android product knowledge template
   - `android/tech-template.md` - Override Android tech knowledge template
   - `android/structure-template.md` - Override Android structure knowledge template
   - `ios/requirements-template.md` - Override iOS requirements document template
   - `ios/design-template.md` - Override iOS design document template
   - `ios/tasks-template.md` - Override iOS tasks document template
   - `ios/spec-template.md` - Override iOS PRD-to-spec document template
   - `ios/product-template.md` - Override iOS product knowledge template
   - `ios/tech-template.md` - Override iOS tech knowledge template
   - `ios/structure-template.md` - Override iOS structure knowledge template

2. **Template Loading Priority**:
   - The system first checks this `user-templates/` directory
   - If a matching template is found here, it will be used
   - Otherwise, the default template from `.ai-sde/templates/` will be used

## Example Custom Template

To create a custom requirements template:

1. Create a file named `android/requirements-template.md` (or `ios/requirements-template.md`) in this directory
2. Add your custom structure, for example:

```markdown
# Requirements Document

## Executive Summary
[Your custom section]

## Business Requirements
[Your custom structure]

## Technical Requirements
[Your custom fields]

## Custom Sections
[Add any sections specific to your workflow]
```

## Template Variables

Templates can include placeholders that will be replaced when documents are created:
- `{{projectName}}` - The name of your project
- `{{featureName}}` - The name of the feature being specified
- `{{date}}` - The current date
- `{{author}}` - The document author

## Best Practices

1. **Start from defaults**: Copy a default template from `.ai-sde/templates/` as a starting point
2. **Keep structure consistent**: Maintain similar section headers for tool compatibility
3. **Document changes**: Add comments explaining why sections were added/modified
4. **Version control**: Track your custom templates in version control
5. **Test thoroughly**: Ensure custom templates work with the AI SDE workflow tools

## Notes

- Custom templates are project-specific and not included in the package distribution
- The `.ai-sde/templates/` directory contains the default templates which are updated with each version
- Your custom templates in this directory are preserved during updates
- If a custom template has errors, the system will fall back to the default template
- Location controlled by `userCustomDir` in `.ai-sde/config.toml`
