# Agent Rule Sets

This directory contains rule sets for configuring and enforcing developer hygiene and best practices for AI coding agents.

## Overview

Agent rule sets provide a configurable way to ensure AI agents follow consistent best practices when working with code. Rules can warn, enforce, or provide advisory guidance on various aspects of development workflow.

## Rule Set Files

- **`schema.yaml`** - Defines the YAML structure for rule sets
- **`coding.rules.yaml`** - Rules for coding agents (Claude Code, OpenAI Codex, etc.)
- **`research.rules.yaml`** - Rules for research agents
- **`writing.rules.yaml`** - Rules for writing and documentation agents

## Rule Structure

Each rule set contains:

- **Metadata**: ID, name, description, version, and target agent types
- **Rules**: Array of individual rules with validation and enforcement configuration

### Rule Properties

```yaml
id: unique_rule_id
name: Human-Readable Name
description: Detailed description of what this rule enforces
enforcement: warn | enforce | advisory
scope: commit | workflow | pr | push | precommit
enabled: true | false
```

### Enforcement Levels

- **`warn`**: Rule violation is logged but doesn't block the action
- **`enforce`**: Rule violation blocks the action from completing
- **`advisory`**: Informational only, no enforcement

### Scopes

- **`commit`**: Applies to git commit operations
- **`workflow`**: Applies to overall development workflow
- **`pr`**: Applies when creating/updating pull requests
- **`push`**: Applies to git push operations
- **`precommit`**: Runs before git commit (like pre-commit hooks)

## Validation Types

### Command Validation

Runs a shell command to validate the rule:

```yaml
validation:
  type: command
  command: |
    npm test
  success_code: 0
```

### Regex Validation

Matches content against a regular expression:

```yaml
validation:
  type: regex
  pattern: '^(feat|fix|docs)(\(.+\))?: .+'
```

### API Validation

Calls an external API for validation:

```yaml
validation:
  type: api
  endpoint: https://validator.example.com/check
```

## Auto-Fix

Rules can include auto-fix capabilities:

```yaml
autofix:
  enabled: true
  command: npm run lint:fix
  requires_approval: false
  timeout: 120
```

## Conditional Rules

Rules can be conditional based on file patterns or branch patterns:

```yaml
conditions:
  file_patterns:
    - "*.ts"
    - "*.tsx"
  branch_patterns:
    - "^feature/.*"
```

## Using Rule Sets

### Via REST API

#### List all rule sets
```bash
GET /rules
```

#### Get a specific rule set
```bash
GET /rules/coding-agent-rules
```

#### Enforce rules
```bash
POST /rules/coding-agent-rules/enforce
{
  "agent_id": "claude-code",
  "scope": "commit",
  "context": {
    "files": ["src/index.ts"],
    "message": "feat: add new feature"
  }
}
```

#### Get metrics
```bash
GET /rules/metrics/agent/claude-code
```

#### Get Prometheus metrics
```bash
GET /rules/metrics/prometheus
```

### Agent Registration

Agents can specify which rule set to use during registration:

```json
{
  "id": "claude-code",
  "name": "Claude Code",
  "type": "coding",
  "rule_set_id": "coding-agent-rules"
}
```

## Creating Custom Rule Sets

1. Create a new `.rules.yaml` file in this directory
2. Follow the schema defined in `schema.yaml`
3. Reload rule sets via API: `POST /rules/reload`

Example minimal rule set:

```yaml
id: custom-agent-rules
name: Custom Agent Rules
description: Custom rules for my agent
version: "1.0"
agent_types:
  - custom

rules:
  - id: my_rule
    name: My Custom Rule
    description: Ensures something important
    enforcement: warn
    scope: commit
    enabled: true
    validation:
      type: command
      command: echo "Checking..."
      success_code: 0
    metadata:
      priority: 50
      tags:
        - custom
```

## Metrics

The system tracks:

- **Violation counts** per agent and rule
- **Last violation timestamps**
- **Enforcement outcomes** (accepted, warned, blocked)
- **Check latency** for performance monitoring
- **Auto-fix success rate**

Metrics are available in:
- JSON format via `/rules/metrics/all`
- Prometheus format via `/rules/metrics/prometheus`
- Per-agent via `/rules/metrics/agent/:agentId`

## Best Practices

1. **Start with warnings**: Use `enforcement: warn` when introducing new rules
2. **Test rules individually**: Validate each rule before enabling enforcement
3. **Document thoroughly**: Include clear descriptions and docs_url links
4. **Monitor metrics**: Track violation rates to tune rule sensitivity
5. **Version control**: Keep rule sets in git for change tracking
6. **Gradual rollout**: Enable strict enforcement after validating with warnings

## Examples

### Coding Agent Rules

- Always add unit tests for new code
- Create branches for all changes (no direct commits to main)
- Run linters before committing
- Ensure tests pass before creating PRs
- Follow commit message conventions
- Prevent committing secrets

### Research Agent Rules

- Always cite sources
- Verify factual claims
- Use multiple independent sources
- Include timestamps for research
- Disclose potential biases

### Writing Agent Rules

- Run spell check
- Validate all hyperlinks
- Use proper heading hierarchy
- Include table of contents for long documents
- Specify language for code blocks

## Troubleshooting

### Rule not triggering

- Check if rule is enabled: `enabled: true`
- Verify scope matches the operation
- Check file_patterns if using conditions
- Review agent's rule_set_id matches

### High latency

- Optimize validation commands
- Add timeout limits
- Consider async validation for slow checks

### False positives

- Adjust enforcement level to `warn`
- Refine validation patterns/commands
- Add more specific conditions

## Security

- **Command injection**: Auto-fix commands run with shell access - review carefully
- **Approval gates**: Set `requires_approval: true` for sensitive auto-fixes
- **Least privilege**: Validate commands run with minimal necessary permissions

## Support

For issues or questions:
- GitHub Issues: https://github.com/britt/llpm/issues
- Documentation: https://github.com/britt/llpm/wiki/Agent-Rules
