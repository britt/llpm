---
title: Planning Skills
weight: 1
---

Planning skills help you break down projects, gather requirements, and create actionable plans with timelines and dependencies.

## project-planning

Orchestrate comprehensive project planning workflows that generate GitHub issues, architecture diagrams, dependency graphs, and timeline charts.

**Triggers:**
- "Let's build a project plan for..."
- "Help me plan [project name]"
- "Break down this project"
- "Help me scope out..."

**Tools Used:**
- `create_github_issue` - Create individual issues
- `list_github_issues` - Check existing issues
- `add_note` - Save planning artifacts
- `read_project_file` - Analyze existing codebase
- `get_project_scan` - Get project analysis
- `load_skills` - Load sub-skills for specific tasks

**Key Features:**
- Coordinates four specialized sub-skills: issue-decomposition, architecture-diagramming, dependency-mapping, and timeline-planning
- Walks through an 8-step planning workflow from understanding to creation
- Generates a comprehensive planning document saved to `docs/plans/`
- Previews all artifacts before creating issues

---

## requirement-elicitation

Adaptive conversational wizard for eliciting project requirements. Guides users through functional, nonfunctional, and edge-case requirements with domain-specific questions.

**Triggers:**
- "Let's define requirements"
- "Help me figure out what to build"
- Starting a new project or defining product requirements

**Tools Used:**
- `start_requirement_elicitation` - Begin a new session
- `record_requirement_answer` - Save user responses
- `advance_elicitation_section` - Move to next section
- `generate_requirements_document` - Create final document
- `add_note` - Save requirements to notes

**Key Features:**
- Supports 10 domain types: web-app, api, full-stack, cli, mobile, data-pipeline, library, infrastructure, ai-ml, and general
- Covers 5 sections: Overview, Functional, Nonfunctional, Constraints, Edge Cases
- Asks questions one at a time conversationally
- Allows revisiting and refining any section
- Generates comprehensive requirements documents

**Domain Selection:**

| Domain | Description |
|--------|-------------|
| web-app | Frontend web applications |
| api | REST or GraphQL backend services |
| full-stack | Combined frontend and backend |
| cli | Command-line tools |
| mobile | iOS, Android, cross-platform |
| data-pipeline | ETL, data transformations |
| library | Reusable packages, SDKs |
| infrastructure | DevOps, cloud infrastructure |
| ai-ml | AI/ML applications |
| general | Projects that don't fit above |

---

## issue-decomposition

Transform high-level project descriptions into well-structured GitHub issues with user stories, acceptance criteria, dependencies, and estimates.

**Triggers:**
- "Create issues for..."
- "Break this into tasks"
- "Decompose this feature"
- Converting requirements into GitHub issues

**Tools Used:**
- `create_github_issue` - Create issues with full details
- `list_github_issues` - Check existing issues
- `search_github_issues` - Find related issues
- `add_note` - Save decomposition summary

**Key Features:**
- Generates 5-15 well-structured issues per project
- Each issue includes user story, description, acceptance criteria, dependencies, labels, and estimate
- Uses INVEST criteria (Independent, Negotiable, Valuable, Estimable, Small, Testable)
- Previews all issues before creation
- Maps dependencies between issues

**Issue Template:**

```markdown
# [Concise, Action-Oriented Title]

## User Story
As a [persona], I want [goal] so that [benefit].

## Description
[2-4 sentences of context]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Dependencies
- Blocked by: #[number]
- Blocks: #[number]

## Labels
`[type]`, `[area]`, `[priority]`

## Estimate
[Small/Medium/Large/XL]
```

**Estimation Guidelines:**

| Size | Duration | Complexity |
|------|----------|------------|
| Small | 0.5-1 day | Single file, clear implementation |
| Medium | 2-3 days | Multiple files, some unknowns |
| Large | 4-5 days | Multiple components, integration |
| XL | 1+ week | Consider breaking down further |

---

## timeline-planning

Generate Mermaid Gantt charts for project timelines with phases, dependencies, and milestones based on GitHub issues.

**Triggers:**
- "What would the timeline look like?"
- "Create a Gantt chart"
- "Show me the project schedule"
- After issue decomposition to visualize scheduling

**Tools Used:**
- `list_github_issues` - Get issues with estimates
- `add_note` - Save timeline to notes
- `search_github_issues` - Find specific issues

**Key Features:**
- Converts T-shirt size estimates to day durations
- Respects issue dependencies for task ordering
- Groups tasks into logical phases
- Highlights critical path
- Supports milestones and parallel workstreams

**Estimate to Duration Conversion:**

| Estimate | Duration |
|----------|----------|
| Small | 1 day |
| Medium | 3 days |
| Large | 5 days |
| XL | 8 days |

**Task States:**

| Modifier | Meaning |
|----------|---------|
| `done` | Completed |
| `active` | In progress |
| `crit` | Critical path |
| `milestone` | Key deliverable |

---

## stakeholder-tracking

Define stakeholder personas and track their goals to ensure all perspectives are addressed throughout the project lifecycle.

**Triggers:**
- Starting a new project and identifying stakeholders
- Planning features to ensure coverage
- Reviewing plans for stakeholder alignment
- Resolving conflicts between stakeholder needs

**Tools Used:**
- `add_stakeholder` - Create stakeholder profiles
- `list_stakeholders` - View all stakeholders
- `get_stakeholder` - View specific stakeholder
- `link_issue_to_goal` - Connect issues to goals
- `generate_coverage_report` - Check goal coverage
- `resolve_stakeholder_conflict` - Document tradeoffs

**Key Features:**
- Tracks stakeholder name, role, description, goals, pain points, and priorities
- Links GitHub issues to stakeholder goals
- Generates coverage reports showing which goals are addressed
- Identifies and documents conflicts between stakeholder priorities
- Stores data in human-readable markdown

**Stakeholder Profile Structure:**

| Field | Description |
|-------|-------------|
| Name | Unique identifier (e.g., "End User") |
| Role | Position or function |
| Description | Brief explanation of who they are |
| Goals | What they want to achieve |
| Pain Points | Current frustrations |
| Priorities | Ranked list of what matters most |

**Commands:**

```bash
/stakeholder list              # List all stakeholders
/stakeholder add <name>        # Add new stakeholder
/stakeholder show <name>       # Show details
/stakeholder coverage          # Generate coverage report
/stakeholder link <issue#>     # Link issue to goal
```
