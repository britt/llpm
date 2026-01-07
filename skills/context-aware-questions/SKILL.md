---
name: context-aware-questions
description: "Proactively identify information gaps in project context and generate actionable questions to surface missing requirements, unclear specifications, or documentation gaps"
tags:
  - questions
  - gaps
  - requirements
  - analysis
  - documentation
---

# Context-Aware Question Generator Skill

Analyze project context to surface information gaps and generate prioritized, actionable questions.

## When to Use

Activate when:
- User asks "what am I missing?" or "what questions should I be asking?"
- Reviewing issues before starting work
- Analyzing documentation completeness
- Preparing a draft (issue, PR, document) for submission
- During project planning or kickoff

## Available Tools

This skill leverages the following tools:

### generate_project_questions
Scans the entire project context (issues, notes, project scan) for information gaps.

**Best for**: Holistic project review, "what's missing overall?"

### generate_issue_questions
Analyzes a specific GitHub issue for missing requirements or unclear specifications.

**Best for**: Pre-work review, issue clarification

### suggest_clarifications
Reviews a draft (issue, PR, note) before submission and suggests improvements.

**Best for**: Quality check before posting

### identify_information_gaps
Scans a specific target (README, documentation, codebase) for gaps.

**Best for**: Targeted documentation review

## Output Structure

Questions are categorized and prioritized:

### Categories
- **requirements**: Missing acceptance criteria, unclear specs, vague descriptions
- **technical**: Implementation questions, architecture decisions
- **documentation**: Missing docs, unclear README sections
- **process**: Workflow gaps, missing labels/assignees
- **consistency**: Conflicting information across sources
- **architecture**: High-level design questions (requires project scan)

### Priorities
- **high**: Blocking or critical gaps that need immediate attention
- **medium**: Important gaps that should be addressed soon
- **low**: Nice-to-have clarifications

## Example Workflows

### 1. Project-Wide Review

```
User: "What questions should I be asking about this project?"

Assistant uses: generate_project_questions

Output:
## Information Gaps Found

### High Priority (3)
1. [requirements] Issue #42 lacks acceptance criteria
   - Context: "Add login feature" has no definition of done
   - Suggested Action: Add checkboxes with acceptance criteria

2. [documentation] No API documentation found
   - Context: Project has 15 endpoints but no API reference
   - Suggested Action: Create docs/api.md with endpoint documentation

3. [requirements] Issue #38 has vague description
   - Context: Description is only 20 characters
   - Suggested Action: Expand with problem statement and expected behavior

### Medium Priority (5)
...
```

### 2. Issue Review Before Starting Work

```
User: "Are there any gaps in issue #42?"

Assistant uses: generate_issue_questions with issue_number: 42

Output:
## Issue #42 Analysis

### Questions to Clarify

1. [requirements] What are the acceptance criteria?
   - Issue lacks checkboxes or "done when" statement

2. [technical] What authentication method should be used?
   - No mention of OAuth, JWT, or session-based auth

3. [process] Who should be assigned to this issue?
   - Issue has no assignee
```

### 3. Draft Review Before Submission

```
User: "Help me improve this issue before I submit it:
Title: Bug in login
Body: Login doesn't work"

Assistant uses: suggest_clarifications with draft_type: 'issue'

Output:
## Suggested Clarifications

1. [requirements] What are the acceptance criteria?
   - Add an "Acceptance Criteria" section with checkboxes

2. [requirements] Can you provide more detail?
   - The description is very brief (18 chars)
   - Add: problem description, expected behavior, context

3. [requirements] How can this bug be reproduced?
   - Add "Steps to Reproduce" section

Improved draft:
---
## Problem
[Describe what's happening]

## Expected Behavior
[What should happen instead]

## Steps to Reproduce
1. Go to /login
2. Enter credentials
3. Click submit
4. Observe error

## Acceptance Criteria
- [ ] Login works with valid credentials
- [ ] Appropriate error shown for invalid credentials
```

### 4. Documentation Gap Analysis

```
User: "What's missing from our documentation?"

Assistant uses: identify_information_gaps with target: 'documentation'

Output:
## Documentation Gaps

1. [documentation] No docs/ directory found
   - Suggested Action: Create docs/ with API reference, guides

2. [documentation] README lacks usage examples
   - No code blocks or example snippets found

3. [documentation] No contribution guidelines
   - No CONTRIBUTING.md or contributing section in README
```

## Gap Detection Rules

### Issue Analysis
- Missing acceptance criteria (no checkboxes, no "done when")
- Vague descriptions (< 100 chars, contains "unclear", "might", "maybe")
- Missing labels or assignees
- Stale issues (open > 30 days with no activity)
- Bug reports without reproduction steps

### Documentation Analysis
- Missing README sections (install, usage, examples)
- No dedicated docs/ directory
- Short README (< 500 chars)
- Missing license information
- No inline documentation (JSDoc/docstrings)

### Project-Wide Analysis
- Inconsistencies between issues and notes
- Missing architecture documentation
- Undocumented key files
- No project scan available

## Best Practices

### When Generating Questions
1. Always prioritize by impact
2. Group related questions together
3. Provide actionable suggested actions
4. Link to specific sources (issue number, file path)

### When Reviewing Drafts
1. Be constructive, not critical
2. Suggest specific improvements
3. Provide example text when helpful
4. Acknowledge what's already good

### When Analyzing Documentation
1. Check against industry standards
2. Consider the project type (CLI needs different docs than library)
3. Leverage project scan data when available
