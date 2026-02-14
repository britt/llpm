---
title: Documentation Skills
weight: 5
---

Documentation skills help format content consistently, write effective user stories, and generate FAQs from project history.

## markdown-formatting

Format AI outputs into consistent, readable Markdown for PRs, issues, docs, and notes.

**Triggers:**
- Producing PR descriptions and issue bodies
- Writing documentation and guides
- Creating notes and summaries
- Any structured text output

**Key Features:**
- Enforces consistent formatting rules
- Provides templates for common document types
- Identifies and corrects anti-patterns

**Core Principles:**

1. **Lead with the point** - TL;DR or summary first, details after
2. **Use structure** - Headings, lists, and whitespace aid scanning
3. **Be consistent** - Same patterns across all outputs
4. **Respect context** - PRs need checklists, docs need examples

**Formatting Rules:**

| Element | Rule |
|---------|------|
| Headings | Use `##` for main sections, `###` for subsections |
| Lists | Use `-` for unordered, `1.` for ordered |
| Code | Always specify language: ` ```typescript ` |
| Emphasis | **Bold** for key terms, *italics* sparingly |
| Links | Descriptive text, not "click here" |

**Document Structure:**

```markdown
# Title (standalone documents only)

Brief summary or TL;DR (1-2 sentences)

## Section Heading

Content organized by topic...
```

**PR Description Template:**

```markdown
## Summary

[One-line description of the change]

## Changes

- [Change 1]
- [Change 2]

## Test Plan

- [ ] [Test case 1]
- [ ] [Test case 2]
```

**Issue Body Template:**

```markdown
## Problem

[What is wrong or missing]

## Steps to Reproduce

1. [Step 1]
2. [Step 2]

## Expected

[What should happen]

## Actual

[What actually happens]
```

**Anti-patterns to Avoid:**

- Walls of text without structure
- Inconsistent list markers (mixing `*`, `-`, `+`)
- Code blocks without language identifiers
- Headings used as emphasis
- Trailing whitespace or excessive blank lines

---

## user-story-template

Write well-formed user stories with acceptance criteria following agile best practices.

**Triggers:**
- Creating new features or requirements
- Writing GitHub issues for product work
- Planning sprints or releases
- Documenting user needs

**Tools Used:**
- GitHub integration for issue creation
- `add_note` - Save user story drafts

**Key Features:**
- Enforces "As a... I want... So that..." format
- Requires testable acceptance criteria
- Includes quality checklist (INVEST criteria)
- Identifies common pitfalls

**User Story Format:**

```markdown
# [Clear, Concise Feature Name]

## User Story

As a [type of user]
I want [an action or feature]
So that [benefit or value]

## Acceptance Criteria

Given [initial context]
When [action occurs]
Then [expected outcome]
And [additional outcomes]

## Dependencies

- What must be completed first?

## Open Questions

- What needs clarification?

## Technical Notes

- Implementation guidance
```

**Quality Checklist (INVEST):**

| Criterion | Description |
|-----------|-------------|
| **I**ndependent | Can be developed separately |
| **N**egotiable | Details can be discussed |
| **V**aluable | Delivers clear value |
| **E**stimable | Team can estimate effort |
| **S**mall | Completable in one sprint |
| **T**estable | Success criteria are clear |

**Common Pitfalls:**

Too Technical:
- Wrong: "Add a REST endpoint at /api/v2/users with authentication"
- Right: "As an admin, I want to manage user accounts via API, so that I can automate user provisioning"

Too Vague:
- Wrong: "Make the dashboard better"
- Right: "As a manager, I want to see project velocity trends, so that I can forecast delivery dates"

Missing the "Why":
- Wrong: "As a user, I want dark mode"
- Right: "As a user, I want dark mode, so that I can reduce eye strain during evening work sessions"

**Example:**

```markdown
# Multi-Project Dashboard View

## User Story

As a product manager overseeing multiple projects
I want to view aggregated metrics across all my projects in one dashboard
So that I can identify bottlenecks and allocate resources effectively

## Acceptance Criteria

Given I manage 3 active projects
When I navigate to the "Overview" dashboard
Then I see a summary card for each project showing:
- Project name and status
- Open vs closed issues count
- Recent activity (last 7 days)
- Team members assigned

And I can click any project card to drill into details
And the dashboard loads in under 2 seconds
And data refreshes every 5 minutes automatically

## Dependencies

- Project metadata API must support batch queries
- User must have "manager" role on at least one project

## Open Questions

- Should we limit to 10 projects max, or paginate?
- Do we show archived projects by default?
```

---

## build-faq-from-issues

Extract common questions from closed GitHub issues and generate an FAQ document with answers and source links.

**Triggers:**
- Creating or updating project FAQ
- Documenting common support questions
- Reducing repeat questions in issues
- Onboarding new users/contributors

**Key Features:**
- Scans closed issues for question patterns
- Groups questions by category
- Synthesizes answers from resolutions
- Links back to source issues

**Output Structure:**

```markdown
## FAQ: [Project/Topic]

**Generated from**: [X closed issues]
**Labels scanned**: [question, help, support]

### General

#### Q: [Common question]

[Answer synthesized from issue resolution]

- See #123

#### Q: [Another question]

[Answer]

- See #456

### Setup & Installation

#### Q: [Setup question]

[Answer with steps if needed]

- See #789

### Troubleshooting

#### Q: [Error or problem question]

[Answer with solution]

- See #101
```

**Question Selection Guidelines:**

| Include | Exclude |
|---------|---------|
| Closed/resolved issues | One-off bugs |
| Issues labeled `question`, `help`, `support` | Feature requests |
| Frequently recurring questions | Issues without clear resolution |

**Answer Quality:**

- Write standalone answers (don't require reading the issue)
- Include concrete steps when applicable
- Keep answers concise but complete
- Link to docs if more detail exists elsewhere

**Organization:**

- Group by logical categories (General, Setup, Troubleshooting, Configuration)
- Put most common questions first within each category
- Use consistent question phrasing
- Deduplicate similar questions into single entry

**Deduplication:**

When multiple issues ask the same thing:
- Combine into one FAQ entry
- Reference all related issues: "See #123, #456"
- Use the clearest answer from any of them

**Maintenance:**

- Note when FAQ was last generated
- Flag answers that may be outdated
- Suggest issues that should be added to FAQ
