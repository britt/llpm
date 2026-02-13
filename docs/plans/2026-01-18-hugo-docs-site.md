# Hugo Documentation Site Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a professional documentation site for LLPM using Hugo and GitHub Pages with search functionality.

**Architecture:** Hugo static site in `/docs` directory, deployed via GitHub Actions to gh-pages branch. Built-in FlexSearch for search. Content sourced from existing markdown files and new documentation.

**Tech Stack:** Hugo (static site generator), [Hextra theme](https://github.com/imfing/hextra), FlexSearch (built-in search), GitHub Actions (CI/CD), GitHub Pages (hosting)

---

## Phase 1: Infrastructure Setup

### Task 1: Initialize Hugo Site with Hextra Theme

**Files:**
- Create: `docs/hugo.yaml`
- Create: `docs/go.mod`
- Create: `docs/content/_index.md`
- Create: `docs/.gitignore`

**Step 1: Install Hugo locally and verify**

Run:
```bash
brew install hugo
hugo version
```

Expected: Hugo extended version output (e.g., `hugo v0.xxx+extended`)

**Step 2: Create Hugo site with YAML config**

Run:
```bash
mkdir -p docs
cd docs
hugo new site . --force --format=yaml
```

Expected: Hugo scaffolding created in docs/

**Step 3: Initialize Hugo module and add Hextra theme**

Run:
```bash
cd docs
hugo mod init github.com/britt/llpm/docs
hugo mod get github.com/imfing/hextra
```

Expected: `go.mod` and `go.sum` created with Hextra dependency

**Step 4: Create hugo.yaml configuration**

Create `docs/hugo.yaml`:
```yaml
baseURL: https://britt.github.io/llpm/
languageCode: en-us
title: LLPM Documentation

enableGitInfo: true

module:
  imports:
    - path: github.com/imfing/hextra

menu:
  main:
    - name: Docs
      pageRef: /docs
      weight: 1
    - name: GitHub
      url: "https://github.com/britt/llpm"
      weight: 2
      params:
        icon: github
    - name: Search
      weight: 3
      params:
        type: search
    - name: Theme Toggle
      weight: 4
      params:
        type: theme-toggle

params:
  description: AI-powered project management CLI documentation

  navbar:
    displayTitle: true
    displayLogo: false
    width: wide

  page:
    width: wide

  footer:
    displayPoweredBy: false

  theme:
    default: system
    displayToggle: true

  search:
    enable: true
    type: flexsearch
    flexsearch:
      index: content
      tokenize: forward

  editURL:
    enable: true
    base: "https://github.com/britt/llpm/edit/main/docs/content"

markup:
  goldmark:
    renderer:
      unsafe: true
  highlight:
    noClasses: false
```

**Step 5: Create docs/.gitignore**

Create `docs/.gitignore`:
```
/public/
/resources/
/.hugo_build.lock
```

**Step 6: Create homepage**

Create `docs/content/_index.md`:
```markdown
---
title: LLPM Documentation
layout: hextra-home
---

{{< hextra/hero-badge >}}
  <span>AI-Powered CLI</span>
{{< /hextra/hero-badge >}}

<div class="hx-mt-6 hx-mb-6">
{{< hextra/hero-headline >}}
  Large Language Model&nbsp;<br class="sm:hx-block hx-hidden" />Product Manager
{{< /hextra/hero-headline >}}
</div>

<div class="hx-mb-12">
{{< hextra/hero-subtitle >}}
  AI-powered project management CLI that brings intelligent assistance directly to your terminal.
{{< /hextra/hero-subtitle >}}
</div>

<div class="hx-mb-6">
{{< hextra/hero-button text="Get Started" link="docs/getting-started/" >}}
</div>

{{< hextra/feature-grid >}}
  {{< hextra/feature-card
    title="Multi-Provider AI"
    subtitle="Chat with GPT-4, Claude, Groq, and more. Switch models on the fly."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[340px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(194,97,254,0.15),hsla(0,0%,100%,0));"
  >}}
  {{< hextra/feature-card
    title="GitHub Integration"
    subtitle="Browse repos, create issues, and manage projects directly from the CLI."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-lg:hx-min-h-[340px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(142,53,74,0.15),hsla(0,0%,100%,0));"
  >}}
  {{< hextra/feature-card
    title="Skills System"
    subtitle="Extensible instruction sets for mermaid diagrams, stakeholder updates, and more."
    class="hx-aspect-auto md:hx-aspect-[1.1/1] max-md:hx-min-h-[340px]"
    style="background: radial-gradient(ellipse at 50% 80%,rgba(221,210,59,0.15),hsla(0,0%,100%,0));"
  >}}
{{< /hextra/feature-grid >}}
```

**Step 7: Create docs section index**

Create `docs/content/docs/_index.md`:
```markdown
---
title: Documentation
---

Welcome to the LLPM documentation. Use the sidebar to navigate through the sections.
```

**Step 8: Verify local build works**

Run:
```bash
cd docs && hugo server --buildDrafts --disableFastRender
```

Expected: Server starts at http://localhost:1313/llpm/

Visit URL in browser to verify site renders with Hextra theme.

**Step 9: Commit**

```bash
git add docs/
git commit -m "feat(docs): initialize Hugo site with Hextra theme

- Hugo module setup with Hextra
- FlexSearch enabled
- Homepage with hero and feature cards
- Status: Local build working"
```

---

### Task 2: Create GitHub Actions Workflow

**Files:**
- Create: `.github/workflows/docs.yml`

**Step 1: Create the workflow file**

Create `.github/workflows/docs.yml`:
```yaml
name: Deploy Documentation

on:
  push:
    branches:
      - main
    paths:
      - 'docs/**'
      - '.github/workflows/docs.yml'
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    env:
      HUGO_VERSION: 0.139.0
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.22'

      - name: Setup Hugo
        uses: peaceiris/actions-hugo@v3
        with:
          hugo-version: ${{ env.HUGO_VERSION }}
          extended: true

      - name: Setup Pages
        id: pages
        uses: actions/configure-pages@v5

      - name: Build with Hugo
        env:
          HUGO_ENVIRONMENT: production
          HUGO_ENV: production
          TZ: America/Los_Angeles
        working-directory: docs
        run: |
          hugo --gc --minify --baseURL "${{ steps.pages.outputs.base_url }}/"

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./docs/public

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

**Step 2: Verify workflow syntax**

Run:
```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/docs.yml')); print('Valid YAML')"
```

Expected: "Valid YAML"

**Step 3: Commit**

```bash
git add .github/workflows/docs.yml
git commit -m "ci(docs): add GitHub Actions workflow for docs deployment

- Triggers on docs/ changes to main
- Uses Hugo extended + Go for modules
- Deploys to GitHub Pages"
```

---

## Phase 2: Content Structure

### Task 3: Create Getting Started Section

**Files:**
- Create: `docs/content/docs/getting-started/_index.md`
- Create: `docs/content/docs/getting-started/installation.md`
- Create: `docs/content/docs/getting-started/quickstart.md`
- Create: `docs/content/docs/getting-started/configuration.md`

**Step 1: Create section index**

Create `docs/content/docs/getting-started/_index.md`:
```markdown
---
title: Getting Started
weight: 1
---

Get up and running with LLPM in minutes.
```

**Step 2: Create installation page**

Create `docs/content/docs/getting-started/installation.md`:
```markdown
---
title: Installation
weight: 1
---

## Prerequisites

- [Bun](https://bun.com) runtime (latest version recommended)
- At least one AI provider API key

## Install from Source

1. **Clone the repository**

   ```bash
   git clone https://github.com/britt/llpm.git
   cd llpm
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Make it executable (optional)**

   ```bash
   chmod +x index.ts
   ```

## Install Globally (optional)

```bash
bun link
llpm
```

## Verify Installation

```bash
bun start
# or if linked globally
llpm
```

You should see the LLPM welcome screen and prompt.
```

**Step 3: Create quickstart page**

Create `docs/content/docs/getting-started/quickstart.md`:
```markdown
---
title: Quickstart
weight: 2
---

## Your First Session

1. **Start LLPM**

   ```bash
   bun start
   ```

2. **Chat with the AI**

   Type a message and press Enter:
   ```
   > What can you help me with?
   ```

3. **Try a slash command**

   ```
   /help
   ```

4. **Set up a project**

   ```
   /project add "My App" "owner/repo" "/path/to/project"
   ```

5. **Exit when done**

   Press `Ctrl+C` or type `/quit`

## Next Steps

- [Configuration](../configuration) - Set up API keys and customize behavior
- [User Guide](/docs/user-guide) - Learn about all features
- [Skills](/docs/skills-reference) - Explore the skills system
```

**Step 4: Create configuration page**

Create `docs/content/docs/getting-started/configuration.md`:
```markdown
---
title: Configuration
weight: 3
---

## Environment Variables

Create a `.env` file in your project root:

```bash
cp .env.example .env
```

### AI Providers

Configure at least one AI provider:

```bash
# OpenAI (default provider)
OPENAI_API_KEY=your-openai-api-key

# Anthropic
ANTHROPIC_API_KEY=your-anthropic-api-key

# Groq
GROQ_API_KEY=your-groq-api-key

# Cerebras
CEREBRAS_API_KEY=your-cerebras-api-key

# Google Vertex AI
GOOGLE_VERTEX_PROJECT_ID=your-project-id
GOOGLE_VERTEX_REGION=us-central1
```

### Optional Integrations

```bash
# GitHub integration
GITHUB_TOKEN=your-github-token
```

## Configuration Files

LLPM stores configuration in `~/.llpm/`:

| File | Purpose |
|------|---------|
| `config.json` | Project configurations |
| `chat-sessions/` | Persistent chat history |
| `system_prompt.txt` | Custom system prompt |
| `skills/` | Installed skills |

## Custom System Prompt

Edit the system prompt to customize AI behavior:

```bash
nano ~/.llpm/system_prompt.txt
```

Changes take effect on the next chat session.
```

**Step 5: Verify build**

Run:
```bash
cd docs && hugo --minify
```

Expected: Build succeeds with getting-started section

**Step 6: Commit**

```bash
git add docs/content/docs/getting-started/
git commit -m "docs: add Getting Started section

- Installation instructions
- Quickstart guide
- Configuration reference"
```

---

### Task 4: Create User Guide Section

**Files:**
- Create: `docs/content/docs/user-guide/_index.md`
- Create: `docs/content/docs/user-guide/projects.md`
- Create: `docs/content/docs/user-guide/github-integration.md`
- Create: `docs/content/docs/user-guide/skills.md`
- Create: `docs/content/docs/user-guide/commands.md`

**Step 1: Create section index**

Create `docs/content/docs/user-guide/_index.md`:
```markdown
---
title: User Guide
weight: 2
---

Learn how to use LLPM's features effectively.
```

**Step 2: Create projects page**

Create `docs/content/docs/user-guide/projects.md`:
```markdown
---
title: Project Management
weight: 1
---

LLPM supports managing multiple projects with persistent configuration.

## Adding Projects

### Using Slash Commands

```
/project add "Project Name" "owner/repo" "/path/to/project" "Description"
```

### Using Natural Language

```
> Add my GitHub repository owner/repo as a new project called "My App"
```

## Listing Projects

```
/project list
```

Or ask naturally:
```
> What projects do I have?
```

## Switching Projects

```
/project switch <project-id>
```

Or use the interactive selector:
```
/project switch
```

## Removing Projects

```
/project remove <project-id>
```

## Current Project

View current project information:
```
/project
```

Or:
```
/info
```
```

**Step 3: Create GitHub integration page**

Create `docs/content/docs/user-guide/github-integration.md`:
```markdown
---
title: GitHub Integration
weight: 2
---

LLPM integrates with GitHub for repository management and issue tracking.

## Prerequisites

Set your GitHub token:
```bash
export GITHUB_TOKEN=your-token
```

Required scopes: `repo`, `read:user`

## Commands

### List Repositories

```
/github list
```

### Search Repositories

```
/github search "typescript cli"
```

### View Repository Details

Ask the AI:
```
> Show me details about owner/repo
```

## AI Tools

The AI can use these GitHub tools:

| Tool | Description |
|------|-------------|
| `list_github_repos` | List your repositories |
| `search_github_repos` | Search repositories |
| `get_github_repo` | Get repository details |
| `create_github_issue` | Create issues |
| `comment_on_github_issue` | Add comments |

## Examples

**Create an issue:**
```
> Create an issue in owner/repo titled "Bug: Login fails" with description of the problem
```

**Search for TypeScript projects:**
```
> Find my TypeScript repositories with more than 10 stars
```
```

**Step 4: Create skills page**

Create `docs/content/docs/user-guide/skills.md`:
```markdown
---
title: Skills System
weight: 3
---

Skills are reusable instruction sets that enhance the AI's capabilities.

## How Skills Work

1. Skills are scanned on startup
2. Enabled skills are injected into the system prompt
3. The AI loads skills when their trigger conditions match
4. Loaded skills augment the conversation context

## Managing Skills

### List Available Skills

```
/skills list
```

### Preview a Skill

```
/skills test <skill-name>
```

### Enable/Disable Skills

```
/skills enable <skill-name>
/skills disable <skill-name>
```

### Reload Skills

```
/skills reload
```

### Reinstall Core Skills

```
/skills reinstall
```

## Skill Locations

| Location | Scope |
|----------|-------|
| `~/.llpm/skills/` | Personal (all projects) |
| `.skills/` | Project-specific |
| `skills/` | Project-specific |

## Creating Custom Skills

See [Skills Reference](/docs/skills-reference) for creating your own skills.
```

**Step 5: Create commands reference page**

Create `docs/content/docs/user-guide/commands.md`:
```markdown
---
title: Commands Reference
weight: 4
---

## Slash Commands

| Command | Description |
|---------|-------------|
| `/help` | Show available commands |
| `/info` | Show application and project information |
| `/quit` | Exit the application |
| `/clear` | Start a new chat session |
| `/project` | Manage projects |
| `/github` | Browse GitHub repositories |
| `/model` | Switch AI models |
| `/skills` | Manage skills |
| `/debug` | Show recent debug logs |

## Project Commands

| Command | Description |
|---------|-------------|
| `/project` | Show current project |
| `/project list` | List all projects |
| `/project add <name> <repo> <path> [description]` | Add a project |
| `/project switch [id]` | Switch current project |
| `/project remove <id>` | Remove a project |

## GitHub Commands

| Command | Description |
|---------|-------------|
| `/github list` | List your repositories |
| `/github search <query>` | Search repositories |

## Model Commands

| Command | Description |
|---------|-------------|
| `/model` | Show current model |
| `/model list` | List available models |
| `/model switch [provider/model]` | Switch model |
| `/model providers` | Show provider status |

## Skills Commands

| Command | Description |
|---------|-------------|
| `/skills list` | List all skills |
| `/skills test <name>` | Preview a skill |
| `/skills enable <name>` | Enable a skill |
| `/skills disable <name>` | Disable a skill |
| `/skills reload` | Rescan skills |
| `/skills reinstall` | Reinstall core skills |
```

**Step 6: Verify build**

Run:
```bash
cd docs && hugo --minify
```

Expected: Build succeeds with user-guide section

**Step 7: Commit**

```bash
git add docs/content/docs/user-guide/
git commit -m "docs: add User Guide section

- Project management
- GitHub integration
- Skills usage
- Commands reference"
```

---

### Task 5: Create Skills Reference Section

**Files:**
- Create: `docs/content/docs/skills-reference/_index.md`
- Create: `docs/content/docs/skills-reference/creating-skills.md`
- Create: `docs/content/docs/skills-reference/planning-skills.md`
- Create: `docs/content/docs/skills-reference/visualization-skills.md`
- Create: `docs/content/docs/skills-reference/communication-skills.md`
- Create: `docs/content/docs/skills-reference/documentation-skills.md`
- Create: `docs/content/docs/skills-reference/analysis-skills.md`
- Create: `docs/content/docs/skills-reference/research-skills.md`

**Step 1: Create section index**

Create `docs/content/docs/skills-reference/_index.md`:
```markdown
---
title: Skills Reference
weight: 3
---

LLPM implements the [Agent Skills](https://agentskills.io/home) standard for reusable AI instruction sets.

LLPM includes **19 core skills** organized into 6 categories:

| Category | Skills | Purpose |
|----------|--------|---------|
| [Planning](planning-skills) | 5 | Project planning, requirements, timelines |
| [Visualization](visualization-skills) | 3 | Architecture diagrams, dependency maps |
| [Communication](communication-skills) | 2 | Stakeholder updates, meeting agendas |
| [Documentation](documentation-skills) | 3 | Markdown formatting, user stories, FAQs |
| [Analysis](analysis-skills) | 3 | Risk detection, triage, gap analysis |
| [Research](research-skills) | 3 | Web research, summaries, note synthesis |
```

**Step 2: Create planning skills page**

Create `docs/content/docs/skills-reference/planning-skills.md`:
```markdown
---
title: Planning Skills
weight: 1
---

Skills for project planning, requirements gathering, and timeline management.

## project-planning

**Description:** Orchestrate comprehensive project planning - decompose projects into issues, generate architecture diagrams, map dependencies, and create timelines.

**Triggers:** "Let's build a project plan for...", "Help me plan [project]", "Create a project plan", "Break down this project"

**Tools Used:**
- `create_github_issue` - Create individual issues
- `list_github_issues` - Check existing issues
- `add_note` - Save planning artifacts
- `read_project_file` - Analyze existing codebase
- `load_skills` - Load sub-skills for diagrams and timelines

**Workflow:**
1. Gather project description and context
2. Load sub-skills (architecture-diagramming, issue-decomposition, etc.)
3. Generate issues, diagrams, and timeline
4. Save artifacts to project notes

---

## requirement-elicitation

**Description:** Adaptive conversational wizard for eliciting project requirements. Guides users through functional, nonfunctional, and edge-case requirements with domain-specific questions.

**Triggers:** "Let's define requirements", "Help me figure out what to build", starting a new project

**Tools Used:**
- `start_requirement_elicitation` - Begin the wizard
- `record_requirement_answer` - Capture responses
- `advance_elicitation_section` - Move to next section
- `generate_requirements_document` - Output final document
- `add_note` - Save requirements

**Sections Covered:**
1. Domain selection (web app, API, CLI, mobile, data pipeline)
2. Functional requirements
3. Nonfunctional requirements (performance, security, scalability)
4. Edge cases and error handling
5. Integration requirements

---

## issue-decomposition

**Description:** Decompose project descriptions into well-structured GitHub issues with user stories, acceptance criteria, dependencies, and estimates.

**Triggers:** "Create issues for...", "Break this into tasks", "Decompose this feature"

**Tools Used:**
- `create_github_issue` - Create individual issues
- `list_github_issues` - Check for duplicates
- `search_github_issues` - Find related issues for dependencies
- `add_note` - Save decomposition summary

**Issue Template:**
- User story format
- Acceptance criteria
- Dependencies (blocks/blocked-by)
- Labels (type, priority, component)
- Effort estimate

---

## timeline-planning

**Description:** Generate Mermaid Gantt charts for project timelines with phases, dependencies, and milestones.

**Triggers:** "What would the timeline look like?", "Create a Gantt chart", "Show me the project schedule"

**Tools Used:**
- `list_github_issues` - Get issues with estimates
- `add_note` - Save timeline
- `search_github_issues` - Find specific issues

**Output:** Mermaid Gantt chart with:
- Task durations based on estimates
- Dependencies between tasks
- Milestones and phases
- Critical path highlighting

---

## stakeholder-tracking

**Description:** Define stakeholder personas and track their goals to ensure all perspectives are addressed.

**Triggers:** When managing stakeholder expectations, tracking goal coverage

**Tools Used:**
- `add_stakeholder` - Define new stakeholder
- `list_stakeholders` - View all stakeholders
- `link_issue_to_goal` - Connect issues to stakeholder goals
- `generate_coverage_report` - Check goal coverage
- `resolve_stakeholder_conflict` - Handle conflicting goals

**Features:**
- Stakeholder personas with roles and priorities
- Goal tracking per stakeholder
- Issue-to-goal linking
- Coverage reports showing unaddressed goals
```

**Step 3: Create visualization skills page**

Create `docs/content/docs/skills-reference/visualization-skills.md`:
```markdown
---
title: Visualization Skills
weight: 2
---

Skills for creating diagrams and visual representations of systems and dependencies.

## architecture-diagramming

**Description:** Generate Mermaid architecture diagrams showing system components, layers, and data flows.

**Triggers:** "Show me the system architecture", "Diagram the components", during project planning

**Tools Used:**
- `read_project_file` - Understand existing structure
- `get_project_architecture` - Get analyzed architecture
- `add_note` - Save diagram
- `list_project_directory` - Explore project structure

**Diagram Types:**
- System component diagrams
- Layer diagrams (presentation, business, data)
- Data flow diagrams
- Service interaction diagrams

**Syntax Rules:**
- Never use parentheses inside node labels
- Use quotes for labels with special characters
- Keep node IDs simple alphanumeric

---

## dependency-mapping

**Description:** Generate Mermaid dependency graphs showing issue relationships, blocking chains, and critical paths.

**Triggers:** "Show me the dependencies", "Map the issue dependencies", during sprint planning

**Tools Used:**
- `list_github_issues` - Get all open issues
- `get_github_issue_with_comments` - Get full issue details
- `search_github_issues` - Find specific issues
- `add_note` - Save dependency graph

**Output:** Mermaid flowchart showing:
- Issue nodes with status colors
- Blocking relationships (arrows)
- Critical path highlighting
- Orphaned issues (no dependencies)

---

## mermaid-diagrams

**Description:** Guide for creating syntactically correct Mermaid diagrams that render properly on GitHub.

**Triggers:** When creating flowcharts, sequence diagrams, class diagrams, or any visual diagrams in markdown

**Supported Diagram Types:**
- **Flowcharts** - Process flows, decision trees, algorithms
- **Sequence Diagrams** - API calls, user interactions
- **Class Diagrams** - Object relationships, schemas
- **State Diagrams** - State machines, workflows
- **ER Diagrams** - Database design
- **Gantt Charts** - Project timelines
- **Git Graphs** - Branch strategies

**Critical Syntax Rules:**
- Escape special characters in labels
- Use proper arrow syntax for each diagram type
- Test diagrams render before committing
```

**Step 4: Create communication skills page**

Create `docs/content/docs/skills-reference/communication-skills.md`:
```markdown
---
title: Communication Skills
weight: 3
---

Skills for stakeholder communications and meeting preparation.

## stakeholder-updates

**Description:** Craft clear, concise stakeholder communications with appropriate context and framing.

**Triggers:** Writing status updates, communicating delays, sharing launch announcements, requesting decisions

**Tools Used:**
- GitHub tools for context
- `search_notes` - Find relevant background
- `add_note` - Save drafts

**Update Types:**
- **Status updates** - Progress reports with metrics
- **Delay communications** - Impact, cause, mitigation
- **Launch announcements** - Features, benefits, next steps
- **Decision requests** - Options, recommendations, deadlines

**Core Principles:**
- Lead with the bottom line
- Tailor detail level to audience
- Include clear next steps
- Quantify impact where possible

---

## prepare-meeting-agenda

**Description:** Generate meeting agendas from recent issues, PRs, and notes for sprint planning, retros, and standups.

**Triggers:** Preparing for sprint planning, retrospectives, standups, project check-ins

**Tools Used:**
- `list_github_issues` - Get recent issues
- `search_notes` - Find relevant notes
- GitHub PR tools - Get recent PRs

**Meeting Types:**
- **Sprint Planning** - Velocity, priorities, assignments
- **Retrospective** - What went well, improvements, actions
- **Standup** - Blockers, progress, help needed
- **Project Check-in** - Status, risks, decisions needed

**Output Structure:**
- Meeting objective
- Time-boxed agenda items
- Discussion topics with owners
- Action items from previous meeting
```

**Step 5: Create documentation skills page**

Create `docs/content/docs/skills-reference/documentation-skills.md`:
```markdown
---
title: Documentation Skills
weight: 4
---

Skills for formatting and creating documentation.

## markdown-formatting

**Description:** Format AI outputs into consistent, readable Markdown for PRs, issues, docs, and notes.

**Triggers:** Producing PR descriptions, issue bodies, documentation, notes, any structured text

**Core Principles:**
1. **Lead with the point** - TL;DR or summary first
2. **Use structure** - Headings, lists, whitespace
3. **Be consistent** - Same patterns across outputs
4. **Respect context** - PRs need checklists, docs need examples

**Formatting Guidelines:**
- Use ATX-style headers (`#`, `##`, `###`)
- Use fenced code blocks with language hints
- Use tables for structured data
- Use task lists for action items

---

## user-story-template

**Description:** Guide writing well-formed user stories with acceptance criteria following best practices.

**Triggers:** Creating new features, writing GitHub issues for product work, documenting user requirements

**Tools Used:**
- GitHub issue tools
- `add_note` - Save stories

**User Story Format:**
```
As a [type of user],
I want [goal/desire],
So that [benefit/value].
```

**Acceptance Criteria Format:**
- Given [context]
- When [action]
- Then [expected result]

**Best Practices:**
- Keep stories independent and negotiable
- Include definition of done
- Add technical notes for implementation
- Link related stories

---

## build-faq-from-issues

**Description:** Extract common questions from closed GitHub issues and generate an FAQ document with answers.

**Triggers:** Creating/updating project FAQ, documenting common support questions, onboarding new users

**Tools Used:**
- `list_github_issues` - Get closed issues
- `search_github_issues` - Filter by labels (question, help, support)
- `add_note` - Save FAQ document

**Output Structure:**
- FAQ title and scope
- Questions grouped by topic
- Answers with source links
- Related issues for each answer
```

**Step 6: Create analysis skills page**

Create `docs/content/docs/skills-reference/analysis-skills.md`:
```markdown
---
title: Analysis Skills
weight: 5
---

Skills for analyzing project health, identifying risks, and triaging work.

## at-risk-detection

**Description:** Proactively identify at-risk issues and PRs: stale items, blocked work, deadline risks, scope creep, and unassigned high-priority items.

**Triggers:** Starting sprints, during standups, weekly health checks, before milestone deadlines

**Tools Used:**
- `list_github_issues` - Get all issues
- `search_github_issues` - Find specific patterns
- GitHub PR tools - Check PR status

**Risk Categories:**
- **Stale items** - No activity for 7+ days
- **Blocked work** - Dependencies not resolved
- **Deadline risks** - Approaching milestones with open work
- **Scope creep** - Issues growing in complexity
- **Unassigned priorities** - High-priority items without owners

**Output:** Risk report with severity levels and recommended actions

---

## context-aware-questions

**Description:** Proactively identify information gaps in project context and generate actionable questions to surface missing requirements.

**Triggers:** "What am I missing?", "What questions should I be asking?", reviewing issues before work, analyzing documentation completeness

**Tools Used:**
- `generate_project_questions` - Scan for gaps
- `list_github_issues` - Review existing issues
- `search_notes` - Check documentation

**Gap Categories:**
- Missing requirements
- Unclear specifications
- Undocumented assumptions
- Integration unknowns
- Edge case coverage

**Output:** Prioritized list of questions with:
- Gap description
- Impact if unaddressed
- Suggested owner/source for answer

---

## triage-new-issues

**Description:** Review new GitHub issues, assess priority and urgency, suggest labels, and recommend assignees.

**Triggers:** Processing new incoming issues, reviewing untriaged backlog, assessing priorities

**Tools Used:**
- `list_github_issues` - Get untriaged issues
- `get_github_issue_with_comments` - Full issue details
- GitHub label/assignee tools

**Triage Output (per issue):**
- **Priority Assessment** - P0/P1/P2/P3 with rationale
- **Urgency Signals** - Customer impact, blockers, deadlines
- **Suggested Labels** - Type, component, priority
- **Recommended Owner** - Based on expertise and load
- **Questions** - Clarifications needed before work
```

**Step 7: Create research skills page**

Create `docs/content/docs/skills-reference/research-skills.md`:
```markdown
---
title: Research Skills
weight: 6
---

Skills for conducting research and synthesizing information.

## research-topic-summarize

**Description:** Research topics via web search, synthesize detailed summaries with sources and screenshots.

**Triggers:** Evaluating technologies, learning new concepts, comparing options (X vs Y), gathering background for decisions

**Tools Used:**
- Web search tools
- Screenshot tools
- `add_note` - Save research

**Output Structure:**
- Topic summary
- Key findings (bulleted)
- Pros and cons
- Recommendations
- Sources with links
- Screenshots of key visuals

**Research Types:**
- Technology evaluation
- Library/tool comparison
- Best practices research
- Competitive analysis

---

## summarize-conversation-thread

**Description:** Summarize GitHub issue/PR threads into key decisions, action items, and next steps.

**Triggers:** Catching up on lengthy discussions, preparing to contribute, extracting decisions from closed issues

**Tools Used:**
- `get_github_issue_with_comments` - Full thread
- `add_note` - Save summary

**Output Structure:**
- Issue/PR title and status
- **Key Decisions** - What was decided
- **Discussion Points** - Main topics debated
- **Action Items** - Tasks identified
- **Unresolved Questions** - Open items
- **Next Steps** - What happens next

---

## consolidate-notes-summary

**Description:** Search project notes by topic, synthesize findings into a consolidated summary with cross-references.

**Triggers:** Gathering scattered knowledge, preparing topic summaries, reviewing documentation, identifying gaps

**Tools Used:**
- `search_notes` - Find relevant notes
- `add_note` - Save consolidated summary

**Output Structure:**
- Topic and scope
- Sources reviewed (count, date range)
- **Synthesized Summary** - Key points across sources
- **Cross-References** - Related topics and links
- **Gaps Identified** - Missing information
- **Recommendations** - Next steps for documentation
```

**Step 8: Create creating skills page**

Create `docs/content/docs/skills-reference/creating-skills.md`:
```markdown
---
title: Creating Skills
weight: 2
---

Create custom skills to extend LLPM's capabilities.

## Skill Structure

Skills are markdown files with YAML frontmatter:

```markdown
# ~/.llpm/skills/my-skill/SKILL.md
---
name: my-skill
description: "Brief description of what this skill does"
instructions: "When [condition], [action]"
tags:
  - category
  - subcategory
allowed_tools:
  - tool1
  - tool2
---

# Skill Content

Your detailed instructions here...
```

## Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique identifier (lowercase, hyphens) |
| `description` | Yes | What the skill does (max 1024 chars) |
| `instructions` | No | When to load this skill |
| `tags` | No | Categories for filtering |
| `allowed_tools` | No | Restrict tool access |
| `vars` | No | Variables for substitution |
| `resources` | No | Additional files to load |

## Best Practices

### Clear Trigger Conditions

Write `instructions` that clearly indicate when the skill should activate:

```yaml
# Good
instructions: "When creating Mermaid diagrams for GitHub markdown"

# Too vague
instructions: "When working with diagrams"
```

### Focused Scope

Each skill should do one thing well:

```yaml
# Good - focused
name: api-design
description: "RESTful API design patterns"

# Too broad
name: backend-development
description: "Everything about backend development"
```

### Practical Examples

Include concrete examples in skill content:

~~~markdown
## Examples

### Good API Endpoint

```
GET /users/{id}/projects
```

### Avoid

```
GET /getUserProjects?userId=123
```
~~~

## Skill Locations

| Location | Use Case |
|----------|----------|
| `~/.llpm/skills/` | Personal skills shared across projects |
| `.skills/` | Project-specific skills (gitignored) |
| `skills/` | Project skills (checked into repo) |

## Testing Skills

Preview a skill before using:

```
/skills test my-skill
```

Reload after making changes:

```
/skills reload
```
```

**Step 9: Verify build**

Run:
```bash
cd docs && hugo --minify
```

Expected: Build succeeds with skills-reference section (8 pages)

**Step 10: Commit**

```bash
git add docs/content/docs/skills-reference/
git commit -m "docs: add comprehensive Skills Reference section

- 19 skills documented across 6 categories
- Planning, visualization, communication skills
- Documentation, analysis, research skills
- Guide for creating custom skills"
```

---

### Task 6: Create Contributing Section

**Files:**
- Create: `docs/content/docs/contributing/_index.md`
- Create: `docs/content/docs/contributing/development-setup.md`
- Create: `docs/content/docs/contributing/testing.md`

**Step 1: Create section index**

Create `docs/content/docs/contributing/_index.md`:
```markdown
---
title: Contributing
weight: 4
---

Thank you for your interest in contributing to LLPM!
```

**Step 2: Create development setup page**

Create `docs/content/docs/contributing/development-setup.md`:
```markdown
---
title: Development Setup
weight: 1
---

## Prerequisites

- [Bun](https://bun.com) runtime (latest)
- Node.js 18+ (for compatibility)
- Git

## Clone and Install

```bash
git clone https://github.com/britt/llpm.git
cd llpm
bun install
```

## Environment Setup

```bash
cp .env.example .env
# Edit .env with your API keys
```

## Verify Setup

```bash
# Run tests
bun run test

# Start the app
bun start
```

## Development Scripts

| Script | Description |
|--------|-------------|
| `bun start` | Start LLPM |
| `bun run test` | Run tests |
| `bun run test:watch` | Tests in watch mode |
| `bun run test:coverage` | Coverage report |
| `bun run lint` | Check code style |
| `bun run lint:fix` | Fix style issues |
| `bun run typecheck` | Type checking |
| `bun run format` | Format code |

## Pre-commit Checklist

Before submitting a PR:

1. All tests pass: `bun run test`
2. Coverage maintained: `bun run test:coverage`
3. No lint errors: `bun run lint`
4. Code formatted: `bun run format`
5. Types check: `bun run typecheck`
```

**Step 3: Create testing page**

Create `docs/content/docs/contributing/testing.md`:
```markdown
---
title: Testing
weight: 2
---

LLPM uses [Vitest](https://vitest.dev/) with strict TDD practices.

## Running Tests

```bash
# All tests
bun run test

# Watch mode
bun run test:watch

# With coverage
bun run test:coverage

# With UI
bun run test:ui
```

## Test File Conventions

- **Location:** Next to source files
- **Naming:** `.test.ts` or `.test.tsx`
- **Example:** `src/commands/help.ts` → `src/commands/help.test.ts`

## Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { functionToTest } from './moduleToTest';

describe('ModuleName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('functionToTest', () => {
    it('should handle normal case', () => {
      const result = functionToTest('input');
      expect(result).toBe('expected');
    });

    it('should handle edge cases', () => {
      expect(() => functionToTest(null)).toThrow();
    });
  });
});
```

## Coverage Requirements

- Global minimum: 70%
- Command modules: 80%
- Core utilities: 95%

## TDD Workflow

This project follows strict TDD:

1. Write failing test
2. Verify it fails
3. Write minimal code to pass
4. Verify it passes
5. Refactor if needed
6. Commit
```

**Step 4: Verify build**

Run:
```bash
cd docs && hugo --minify
```

Expected: Build succeeds with contributing section

**Step 5: Commit**

```bash
git add docs/content/docs/contributing/
git commit -m "docs: add Contributing section

- Development setup guide
- Testing guidelines"
```

---

## Phase 3: Final Configuration

### Task 7: Enable GitHub Pages

**Files:**
- None (repository settings)

**Step 1: Push branch with docs workflow**

```bash
git push -u origin britt/212-hugo-docs-site
```

**Step 2: Configure GitHub Pages**

1. Go to repository Settings > Pages
2. Source: GitHub Actions
3. Save

**Step 3: Create PR and merge to trigger deployment**

The workflow triggers on push to main with docs/ changes.

**Step 4: Verify deployment**

After merge, visit: https://britt.github.io/llpm/

Expected: Documentation site loads with all sections

---

### Task 8: Update Root README with Docs Link

**Files:**
- Modify: `README.md`

**Step 1: Add documentation link to README**

Add after the title section in README.md:
```markdown
## Documentation

Full documentation available at: **https://britt.github.io/llpm/**
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add link to documentation site in README"
```

---

## Verification

After completing all tasks:

1. **Local build works:** `cd docs && hugo server --buildDrafts`
2. **GitHub Actions succeeds:** Check workflow run
3. **Site accessible:** Visit https://britt.github.io/llpm/
4. **Search works:** Use search on deployed site (FlexSearch built-in)
5. **All links work:** Navigate through all sections
6. **Mobile responsive:** Test on mobile viewport
7. **Theme toggle works:** Light/dark mode switching

---

## Summary

| Phase | Tasks | Files Created |
|-------|-------|---------------|
| Infrastructure | 2 | hugo.yaml, workflow, go.mod |
| Content | 4 | 20+ markdown files |
| Final | 2 | README update, GitHub Pages |

**Total:** 8 tasks

**Content Summary:**
- Getting Started: 4 pages (index, installation, quickstart, configuration)
- User Guide: 5 pages (index, projects, github, skills, commands)
- Skills Reference: 8 pages (index, creating-skills, + 6 category pages documenting all 19 skills)
- Contributing: 3 pages (index, development-setup, testing)

**Theme:** [Hextra](https://github.com/imfing/hextra) - Modern Hugo theme with built-in FlexSearch, dark mode, and responsive design.

**Note:** This is primarily infrastructure/documentation work, not code requiring TDD. Verification is through successful builds and manual testing of the deployed site.
