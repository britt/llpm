---
name: stakeholder-tracking
description: Define stakeholder personas and track their goals to ensure all perspectives are addressed
tags:
  - stakeholders
  - goals
  - planning
  - requirements
allowed_tools:
  - add_stakeholder
  - list_stakeholders
  - get_stakeholder
  - update_stakeholder
  - remove_stakeholder
  - link_issue_to_goal
  - unlink_issue_from_goal
  - generate_coverage_report
  - resolve_stakeholder_conflict
  - list_github_issues
  - get_github_issue_with_comments
  - search_notes
  - add_note
---

# Stakeholder Tracking

## Purpose

Help users define stakeholder personas and track their goals, ensuring all perspectives are addressed throughout the project lifecycle.

## When to Use This Skill

- Starting a new project and need to identify stakeholders
- Planning features and want to ensure all perspectives are covered
- Reviewing a plan to check stakeholder coverage
- Resolving conflicts between different stakeholder needs
- Linking GitHub issues to stakeholder goals

## Stakeholder Profile Structure

Each stakeholder includes:

- **Name**: Unique identifier (e.g., "End User", "Product Owner")
- **Role**: Their position or function
- **Description**: Brief explanation of who they are
- **Goals**: What they want to achieve (can be linked to GitHub issues)
- **Pain Points**: Current frustrations or problems
- **Priorities**: Ranked list of what matters most to them

## Workflow

### Adding Stakeholders

When a user wants to add a stakeholder, engage conversationally:

1. Ask for the stakeholder's name and role
2. Ask for a brief description
3. Ask about their goals (what do they want to achieve?)
4. Ask about pain points (what frustrates them currently?)
5. Ask about priorities (what matters most, in order?)
6. Confirm the profile and save using `add_stakeholder`

Example:
```
User: "Add a stakeholder"
AI: "I'll help you create a stakeholder profile. What's the name or title for this stakeholder? (e.g., 'End User', 'Product Owner', 'Developer')"
User: "End User"
AI: "What role do they play? For example, 'Daily user of the application' or 'Customer purchasing products'"
...continue gathering information...
```

### Checking Coverage

When asked about stakeholder coverage:

1. Use `generate_coverage_report` to get current status
2. Present goals that are covered (linked to issues) vs gaps (no links)
3. Calculate and show coverage percentages
4. Suggest actions for gaps

### Resolving Conflicts

When stakeholder priorities might conflict:

1. Identify the conflicting priorities
2. Present the conflict clearly to the user
3. Offer resolution options:
   - Prioritize one stakeholder's needs
   - Find a compromise
   - Document as a known tradeoff
4. Record the resolution using `resolve_stakeholder_conflict`

### Linking Issues to Goals

When an issue addresses a stakeholder goal:

1. Use `link_issue_to_goal` to create the connection
2. This helps track how work addresses stakeholder needs
3. Coverage reports will show which goals are addressed

## Natural Language Triggers

Respond to these types of questions:

| Question Type | Action |
|--------------|--------|
| "Who are the stakeholders?" | List all stakeholder profiles |
| "Add a stakeholder" | Start conversational profile creation |
| "What are [Name]'s goals?" | Show specific stakeholder's goals |
| "Does this address stakeholder concerns?" | Generate coverage report |
| "Show me stakeholder coverage" | Generate coverage report |
| "Link issue #X to [goal]" | Create goal-issue link |
| "Are there any conflicts?" | Check for conflicting priorities |

## Commands

Users can also use slash commands:

- `/stakeholder` - List stakeholders or show help
- `/stakeholder list` - List all stakeholders
- `/stakeholder add <name> <role> <description>` - Add stakeholder
- `/stakeholder show <name>` - Show stakeholder details
- `/stakeholder remove <name>` - Remove stakeholder
- `/stakeholder link <issue#> <name> <goal>` - Link issue to goal
- `/stakeholder coverage` - Generate coverage report

## Best Practices

1. **Start with key stakeholders**: Focus on 3-5 primary stakeholders initially
2. **Be specific with goals**: "Complete checkout in under 2 minutes" is better than "Fast checkout"
3. **Link issues early**: When creating issues, immediately link them to relevant goals
4. **Review coverage regularly**: Check coverage when planning sprints or releases
5. **Document conflicts**: When priorities conflict, record the decision and rationale

## Storage

All stakeholder data is stored in:
`~/.llpm/projects/{projectId}/notes/stakeholders.md`

This is a human-readable markdown file that can be viewed and edited directly.
