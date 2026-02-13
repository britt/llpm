---
title: Analysis Skills
weight: 6
---

Analysis skills help identify project risks, triage issues, and surface information gaps before they become problems.

## at-risk-detection

Proactively identify at-risk issues and PRs: stale items, blocked work, deadline risks, scope creep, and unassigned high-priority items.

**Triggers:**
- Starting a new sprint or planning session
- During standup to identify blockers
- Weekly health checks of the project
- When asked about project health or status
- Before milestone deadlines

**Tools Used:**
- `analyze_project_risks` - Scan entire project
- `analyze_issue_risks` - Analyze specific issue
- `get_at_risk_items` - Get filtered list

**Key Features:**
- Detects 5 risk types automatically
- Configurable thresholds
- Supports quick mode and comprehensive mode
- Generates health scores and summaries

**Risk Types Detected:**

| Risk Type | Signal | Default Threshold |
|-----------|--------|-------------------|
| Stale Items | No activity for extended period | 14 days (issues), 3 days (PRs) |
| Blocked Work | Has blocked labels or blocking keywords | Immediate |
| Deadline Risks | Milestone deadline approaching | 7 days warning, 2 days critical |
| Scope Creep | High comment count or large PRs | 30+ comments, 500+ lines |
| Assignment Issues | High-priority without assignee | Immediate |

**Blocked Work Detection:**

Labels that trigger blocked status:
- `blocked`, `waiting`, `on-hold`, `waiting-for-response`

Keywords in issue body:
- "blocked by #", "waiting on", "depends on", "blocked until"

**Commands:**

```bash
/project health          # Quick health summary
/project health --all    # Comprehensive analysis
/project risks           # List at-risk items
/project risks --type stale  # Filter by type
/issue 123               # Analyze specific issue
```

**Usage Modes:**

| Mode | Scope | Speed | Best For |
|------|-------|-------|----------|
| Quick (default) | 30 most recent items | Seconds | Daily checks |
| Comprehensive (`--all`) | All open items | Slower | Milestone reviews |

**Output Format:**

```markdown
## Project Health: [Project Name]

### Summary
- **Total Open Items**: X (Y issues, Z PRs)
- **At-Risk Items**: N
- **Health Score**: X%

### Risk Breakdown
- Critical: X
- Warning: Y
- Info: Z

### Overloaded Assignees
- @username: N assigned issues
```

**Configuration:**

| Setting | Default | Description |
|---------|---------|-------------|
| `staleDays` | 14 | Days before issue is stale |
| `prStaleReviewDays` | 3 | Days before PR awaiting review is stale |
| `deadlineWarningDays` | 7 | Days before deadline to warn |
| `maxCommentsBeforeScopeWarning` | 30 | Comment threshold for scope creep |
| `maxAssignedIssuesPerPerson` | 10 | Max issues before overload warning |

---

## context-aware-questions

Proactively identify information gaps in project context and generate actionable questions to surface missing requirements, unclear specifications, or documentation gaps.

**Triggers:**
- "What am I missing?"
- "What questions should I be asking?"
- Reviewing issues before starting work
- Analyzing documentation completeness
- Preparing drafts for submission

**Tools Used:**
- `generate_project_questions` - Scan entire project for gaps
- `generate_issue_questions` - Analyze specific issue
- `suggest_clarifications` - Review drafts before submission
- `identify_information_gaps` - Scan specific targets

**Key Features:**
- Categorizes questions by type
- Prioritizes by impact
- Provides actionable suggestions
- Includes improved draft examples

**Question Categories:**

| Category | What It Covers |
|----------|----------------|
| requirements | Missing acceptance criteria, unclear specs |
| technical | Implementation questions, architecture decisions |
| documentation | Missing docs, unclear README sections |
| process | Workflow gaps, missing labels/assignees |
| consistency | Conflicting information across sources |
| architecture | High-level design questions |

**Priority Levels:**

| Priority | Description |
|----------|-------------|
| High | Blocking or critical gaps needing immediate attention |
| Medium | Important gaps to address soon |
| Low | Nice-to-have clarifications |

**Gap Detection Rules:**

Issue Analysis:
- Missing acceptance criteria (no checkboxes)
- Vague descriptions (< 100 chars)
- Missing labels or assignees
- Stale issues (> 30 days no activity)
- Bug reports without reproduction steps

Documentation Analysis:
- Missing README sections
- No dedicated docs/ directory
- Short README (< 500 chars)
- Missing license information

**Example Output:**

```markdown
## Information Gaps Found

### High Priority (3)

1. [requirements] Issue #42 lacks acceptance criteria
   - Context: "Add login feature" has no definition of done
   - Suggested Action: Add checkboxes with acceptance criteria

2. [documentation] No API documentation found
   - Context: Project has 15 endpoints but no API reference
   - Suggested Action: Create docs/api.md

3. [requirements] Issue #38 has vague description
   - Context: Description is only 20 characters
   - Suggested Action: Expand with problem statement

### Medium Priority (5)
...
```

---

## triage-new-issues

Review new GitHub issues, assess priority and urgency, suggest labels, and recommend assignees.

**Triggers:**
- Processing new incoming issues
- Reviewing untriaged backlog
- Assessing issue priority
- Assigning issues to owners

**Key Features:**
- Detects priority signals from keywords and labels
- Suggests appropriate labels
- Recommends assignees based on issue area
- Identifies when to escalate

**Priority Signals:**

| Priority | Keywords | Labels |
|----------|----------|--------|
| Critical (P0) | "down", "outage", "security", "vulnerability", "production" | `critical`, `security` |
| High (P1) | "blocking", "regression", "broken", "can't use", "crash" | `blocker`, `regression` |
| Medium (P2) | "bug", "incorrect", "should", "expected", "wrong" | `bug` |
| Low (P3) | "nice to have", "minor", "cosmetic", "workaround exists" | `enhancement` |

**Triage Output:**

```markdown
## Triage: #[number] - [title]

### Priority Assessment

**Urgency**: [Critical | High | Medium | Low]
**Impact**: [Wide | Moderate | Limited]
**Recommended Priority**: P[0-3]

| Signal | Indicator |
|--------|-----------|
| [Keyword found] | [What it suggests] |

### Classification

**Type**: [Bug | Feature | Question | Task]
**Area**: [Component affected]
**Suggested Labels**: `priority/high`, `bug`, `area/auth`
**Suggested Assignee**: @username (owns this area)

### Assessment

[Summary of issue and priority reasoning]

### Recommendation

[Immediate action | Next sprint | Backlog | Needs info | Duplicate of #X]
```

**When to Escalate:**

- Security vulnerabilities - Flag immediately
- Production outages - Notify on-call
- Data integrity issues - High priority regardless

**When to Ask Questions:**

- Unclear reproduction steps
- Missing environment details
- Ambiguous severity
- No indication of urgency

**Red Flags:**

- Issues with no response from author (>7 days)
- Duplicate of closed/wontfix issue
- Feature request disguised as bug
- Missing required template information

**Triage Guidelines:**

1. Read title and full description
2. Scan for urgency keywords and labels
3. Check for existing labels that signal priority
4. Assess impact (how many users affected)
5. Look for workarounds mentioned
6. Check if duplicate of existing issue
