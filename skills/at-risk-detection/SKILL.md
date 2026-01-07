---
name: at-risk-detection
description: "Proactively identify at-risk issues and PRs: stale items, blocked work, deadline risks, scope creep, and unassigned high-priority items"
tags:
  - risk
  - health
  - stale
  - blocked
  - deadline
  - project-management
---

# At-Risk Detection Skill

Proactively scan GitHub issues and pull requests to identify at-risk items before they become problems.

## When to Use

Activate when:
- Starting a new sprint or planning session
- During standup to identify blockers
- Weekly health checks of the project
- When asked about project health or status
- Before milestone deadlines
- When triaging backlog items

## Available Tools

This skill uses the following AI tools:

| Tool | Purpose |
|------|---------|
| `analyze_project_risks` | Scan entire project for at-risk items |
| `analyze_issue_risks` | Analyze a specific issue for risk signals |
| `get_at_risk_items` | Get filtered list of at-risk items |

## Available Commands

| Command | Description |
|---------|-------------|
| `/project health [--all]` | Show project health summary |
| `/project risks [--type TYPE] [--all]` | List at-risk items |
| `/issue NUMBER` | Analyze specific issue for risks |

## Risk Types Detected

### Stale Items
**Signal**: No activity for extended period
**Default Threshold**: 14 days for issues, 3 days for PRs awaiting review
**Severity Escalation**:
- Warning: > threshold days
- Critical: > 2x threshold days

### Blocked Work
**Signals**:
- Has `blocked`, `waiting`, `on-hold`, or `waiting-for-response` labels
- Body contains "blocked by #", "waiting on", "depends on", "blocked until"
- PR is in draft status
- PR has merge conflicts

### Deadline Risks
**Signal**: Milestone deadline approaching or overdue
**Severity Levels**:
- Critical: Overdue or due within 2 days
- Warning: Due within 7 days

### Scope Creep
**Signals**:
- Issues with high comment count (>30 comments)
- PRs with many lines changed (>500 warning, >1000 critical)

### Assignment Issues
**Signal**: High-priority issue without assignee
**Priority Labels**: `priority:high`, `urgent`, `P1`, `P0`, `critical`, `blocker`

## Output Structure

### Project Health Summary

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

### Overloaded Assignees (if any)
- @username: N assigned issues
```

### At-Risk Item Report

```markdown
## At-Risk: #[number] — [title]

**Severity**: [Critical | Warning | Info]
**Type**: [Issue | PR]
**URL**: [link]
**Assignee**: @username

### Risk Signals
- [signal type]: [description]

### Suggestions
- [actionable recommendation]
```

## Usage Modes

### Quick Mode (Default)
Analyzes the 30 most recent open issues and PRs.
- Fast (seconds)
- Good for daily checks
- May miss older stale items

### Comprehensive Mode (`--all`)
Fetches ALL open issues and PRs via pagination.
- Thorough analysis
- Slower for large repositories
- Best for milestone reviews

## Best Practices

1. **Daily Standups**: Run `/project health` to identify blockers
2. **Sprint Planning**: Use comprehensive mode (`--all`) to review full backlog
3. **Before Releases**: Check all deadline risks with `/project risks --type deadline`
4. **Assign Owners**: Address unassigned high-priority items immediately
5. **Break Down Scope**: Split large PRs (>500 lines) into smaller changes

## Example Workflows

### Morning Health Check
```
/project health
```
Review the summary, address any critical items immediately.

### Finding Stale Items
```
/project risks --type stale
```
Comment on stale issues to update status or close if no longer relevant.

### Pre-Sprint Cleanup
```
/project risks --all
```
Review all at-risk items before sprint planning.

### Individual Issue Assessment
```
/issue 123
```
Get detailed risk analysis for a specific issue.

## Configuration

Default thresholds can be customized in the RiskDetectionService:

| Setting | Default | Description |
|---------|---------|-------------|
| `staleDays` | 14 | Days before issue is stale |
| `prStaleReviewDays` | 3 | Days before PR awaiting review is stale |
| `deadlineWarningDays` | 7 | Days before deadline to warn |
| `maxCommentsBeforeScopeWarning` | 30 | Comment threshold for scope creep |
| `maxAssignedIssuesPerPerson` | 10 | Max issues before overload warning |
