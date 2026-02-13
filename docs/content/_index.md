---
title: LLPM
---

# LLPM

LLPM is an AI-powered product management assistant that runs in your terminal. It helps keep software projects organized, work with Git repositories and GitHub, capture notes, and run guided workflows (“skills”) powered by large language models.

## Core concepts

- **Projects** – tracked views of your local codebases (often Git repositories) that LLPM can scan, summarize, and help you manage.
- **Skills** – guided, repeatable workflows for common product management tasks such as triaging issues, planning milestones, and preparing stakeholder updates.
- **Notes** – Markdown notes you can quickly create, search, and refer back to while you work.
- **Models** – connections to one or more LLM providers that LLPM can use for analysis, brainstorming, and content generation.

## Install

You run LLPM from a local checkout of the repository. The steps are the same whether you prefer **bun** or **npm**.

### 1. Clone the repository

```bash
git clone git@github.com:britt/llpm.git
cd llpm
```

### 2. Install dependencies

Using **bun**:

```bash
bun install
```

Using **npm**:

```bash
npm install
```

### 3. Configure API keys and GitHub access

Create a `.env` file in the `llpm` directory with at least one model provider API key and, optionally, a GitHub token:

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...
CEREBRAS_API_KEY=your-cerebras-api-key

# Optional: Google Vertex AI
GOOGLE_VERTEX_PROJECT_ID=your-google-cloud-project-id
GOOGLE_VERTEX_REGION=us-central1

# Optional: GitHub integration
GITHUB_TOKEN=ghp_...
```

Only one model provider key is required to get started. Add more if you want to switch between providers and models.

### 4. Start LLPM

Using **bun**:

```bash
bun start
```

Using **npm**:

```bash
npm run start
```

This starts the LLPM text user interface (TUI) in your terminal.

## Example: set up LLPM for a Git project

This example walks through pointing LLPM at an existing Git project and getting it ready for day-to-day product work.

1. **Make sure your codebase is a Git repository.**

   From your project directory:

   ```bash
   cd /path/to/your/git-project
   git status
   ```

   If it is not already a Git repository, initialize one:

   ```bash
   git init
   ```

2. **Start LLPM from the `llpm` directory.**

   In a separate shell tab or window:

   ```bash
   cd /path/to/llpm
   bun start        # or: npm run start
   ```

   When LLPM starts, you will see its prompt in your terminal.

3. **Scan for projects.**

   From inside the LLPM prompt, run:

   ```text
   /project scan
   ```

   LLPM will look for local directories that contain Git repositories and offer to create tracked projects for them.

4. **Select and switch to your project.**

   After scanning, list available projects and switch to the one you want to work on:

   ```text
   /project list
   /project switch <project-name>
   ```

   Once a project is selected, LLPM can keep context about that codebase while you run skills, take notes, and summarize work.

5. **(Optional) Use GitHub features.**

   If your local Git repository is connected to a GitHub remote and you provided `GITHUB_TOKEN` in `.env`, LLPM can work with issues and pull requests associated with that repository.

## Typical next steps

With a project selected, some useful commands to explore are:

- Capture a quick note related to the project:

  ```text
  /notes add
  ```

- See existing notes:

  ```text
  /notes list
  ```

- Explore available skills and view details for a specific skill:

  ```text
  /skills list
  /skills show <skill-name>
  ```

- Inspect and change model providers and models:

  ```text
  /model providers
  /model list
  /model switch
  ```

<!-- homepage: keep this page pure Markdown (no Hugo shortcodes) -->
