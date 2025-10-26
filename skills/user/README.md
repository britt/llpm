# User Skills Directory

This directory is for your personal custom skills. Skills are reusable instruction sets that the AI can load on demand to provide specialized guidance.

## Creating a New Skill

1. Create a new directory for your skill: `mkdir my-skill-name`
2. Inside that directory, create a `SKILL.md` file
3. Add frontmatter and your instructions

### Skill Structure

```markdown
---
name: my-skill-name
description: 'Brief description of what this skill does (max 1024 chars)'
instructions: 'When asked to [action], [what to do]' # REQUIRED!
tags:
  - tag1
  - tag2
allowed_tools:
  - tool1
  - tool2
---

# My Skill Name

Your detailed markdown instructions here...

## Section 1

Instructions, examples, best practices...

## Section 2

More guidance...
```

**⚠️ IMPORTANT**: The `instructions` field is **REQUIRED**. Skills without this field will fail validation and will not be loaded!

## Frontmatter Fields

### Required Fields

- **`name`**: Unique identifier for your skill (lowercase letters, numbers, and hyphens only, max 64 chars)
- **`description`**: Brief description of what the skill does and when to use it (max 1024 chars)
- **`instructions`**: Single-line guidance on when to use this skill. **MANDATORY - Skills without instructions will not be loaded!**

  **CRITICAL FORMAT REQUIREMENT**: Must start with "When" and follow the pattern: `"When asked to [action], [guidance]"`
  - ✅ Good: `"When asked to create diagrams, use this skill for Mermaid syntax"`
  - ✅ Good: `"When writing API documentation, follow REST conventions"`
  - ❌ Bad: `"Use this skill for diagrams"` (doesn't start with "When")
  - ❌ Bad: `"Creating diagrams"` (not a complete sentence)
  - ❌ **Will fail validation**: Skills without this field will be rejected during loading

### Optional Fields

- **`tags`**: Array of tags for filtering and discovery

  ```yaml
  tags:
    - api
    - documentation
    - rest
  ```

- **`allowed_tools`**: Restrict tool usage when this skill is active (optional)

  ```yaml
  allowed_tools:
    - github
    - notes
    - search_notes
  ```

- **`vars`**: Variables for content substitution using `{{varName}}` syntax

  ```yaml
  vars:
    project_name: 'My Project'
    api_version: 'v2'
  ```

- **`resources`**: Additional files to load from the skill directory
  ```yaml
  resources:
    - example.json
    - template.md
  ```

## Instructions Field Best Practices

The `instructions` field appears in the system prompt to guide the AI on when to load your skill. It should:

1. **Always start with "When"** - This creates a natural conditional statement
2. **Be specific about the trigger** - Clearly state what action or situation should trigger loading this skill
3. **Be concise** - Keep it to one clear sentence
4. **Use present tense** - "When asked to create..." not "When you need to create..."

### Examples

**Good Instructions:**

- `"When asked to create API documentation, follow RESTful conventions"`
- `"When designing database schemas, use this skill for normalization guidance"`
- `"When writing test cases, follow the Given-When-Then pattern"`
- `"When reviewing code for security issues, check for common vulnerabilities"`
- `"When planning sprints, use this skill for estimation and prioritization"`

**Bad Instructions:**

- `"Use this for APIs"` - Not specific, doesn't start with "When"
- `"API documentation skill"` - Just a title, not guidance
- `"This helps with database design"` - Doesn't start with "When"

## How Skills Work

1. **Discovery**: LLPM scans this directory on startup and when `/skills reload` is called
2. **System Prompt Injection**: All enabled skills with instructions are listed in the system prompt
3. **AI Awareness**: The AI sees your instructions and knows when to load your skill
4. **Loading**: When the AI loads your skill via the `load_skills` tool, the full content is added to its context
5. **Tool Restrictions**: If `allowed_tools` is specified, only those tools can be used while the skill is active

## Example Skill: API Documentation

```markdown
---
name: api-docs
description: 'Guide for writing clear API documentation following industry best practices'
instructions: 'When asked to write API documentation, use REST conventions and OpenAPI standards'
tags:
  - api
  - documentation
  - rest
  - openapi
allowed_tools:
  - github
  - notes
---

# API Documentation Skill

This skill provides guidance for writing clear, comprehensive API documentation.

## Documentation Structure

### Endpoint Format
```

### POST /api/v1/users

Create a new user account.

**Authentication**: Required (Bearer token)

**Request Body:**
\`\`\`json
{
"email": "user@example.com",
"name": "John Doe",
"role": "admin"
}
\`\`\`

**Response (201 Created):**
\`\`\`json
{
"id": "usr_123",
"email": "user@example.com",
"name": "John Doe",
"created_at": "2024-01-15T10:30:00Z"
}
\`\`\`

**Error Responses:**

- 400 Bad Request - Invalid input
- 409 Conflict - Email already exists

```

## Best Practices

1. **Always document authentication requirements**
2. **Include example requests and responses**
3. **List all possible error codes**
4. **Specify required vs optional fields**
5. **Document rate limits and quotas**

## OpenAPI Schema

Include an OpenAPI/Swagger schema for automated API documentation.
```

## Managing Skills

### Slash Commands

- `/skills list` - List all discovered skills and their status
- `/skills test my-skill-name` - Preview a skill's content before using it
- `/skills enable my-skill-name` - Enable a disabled skill
- `/skills disable my-skill-name` - Disable a skill
- `/skills reload` - Rescan directories and reload all skills

### AI Tools

The AI can use these tools to work with skills:

- `load_skills` - Load one or more skills to augment context
- `list_available_skills` - List available skills with optional tag filtering

### Natural Language

You can also ask the AI naturally:

- "Load the api-docs skill"
- "What skills are available for testing?"
- "Show me the content of the database-design skill"

## Skill Locations

Skills can be placed in different directories based on their scope:

- **`~/.llpm/skills/`** - Personal skills (shared across all projects)
- **`~/.llpm/skills/user/`** - User-specific personal skills (this directory)
- **`.llpm/skills/`** - Project-specific skills (not shared between projects)

## Tips

1. **Start simple**: Create a basic skill and test it before adding complexity
2. **Use examples**: Include real-world examples in your skill content
3. **Test thoroughly**: Use `/skills test` to preview before enabling
4. **Tag appropriately**: Good tags make skills easier to discover
5. **Version control**: Keep your skills in git for versioning and backup
6. **Share useful skills**: Consider contributing generally useful skills to the community

## Need Help?

- Run `/skills help` for command reference
- Check the main README.md at the repository root for detailed documentation
- Review core skills in `~/.llpm/skills/` for examples

## Core Skills Reference

LLPM comes with three core skills as examples:

1. **mermaid-diagrams** - Create syntactically correct Mermaid diagrams
2. **stakeholder-updates** - Craft clear stakeholder communications
3. **user-story-template** - Write well-formed user stories

Study these skills to learn best practices for skill creation!
