---
title: LLPM
---

# LLPM

LLPM is an AI-powered product management CLI that runs in your terminal. It helps product teams keep projects, Git history, GitHub issues, notes, and AI-assisted workflows in one place.

Use LLPM to:

- Track and switch between multiple Git-based projects
- Connect to GitHub to work with issues and pull requests
- Keep Markdown notes alongside your repositories
- Run guided “skills” for common product-management workflows (planning, requirements, stakeholder updates, research, and more)
- Use multiple LLM providers and switch models without changing your workflow

## Install LLPM (from source)

LLPM is a Node.js application. You install it from source and can choose either Bun or npm to manage dependencies.

### 1. Clone the repository

```bash
git clone https://github.com/britt/llpm.git
cd llpm
```

### 2. Install dependencies with Bun

If you use Bun as your JavaScript runtime:

```bash
bun install
```

### 3. Or install dependencies with npm

If you prefer Node.js with npm:

```bash
npm install
```

### 4. Configure providers and GitHub

Create a `.env` file in the LLPM directory with at least one model provider API key. Optionally add a GitHub token so LLPM can read and update issues and pull requests for your repositories.

```bash
# Required: at least one LLM provider
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

### 5. Start LLPM

Using Bun:

```bash
bun start
```

Using npm:

```bash
npm run start
```

This opens an interactive LLPM session in your terminal.

## Example: set up LLPM for a new Git project

This example walks through creating a new Git repository, adding some basic files, and managing it from LLPM.

### 1. Create a Git repository for your project

In the directory where you keep your code projects, create a new folder and initialize Git:

```bash
mkdir my-product
cd my-product

git init

echo "# My Product" > README.md
git add README.md
git commit -m "Initial commit"
```

Optionally, connect the repository to GitHub:

```bash
git remote add origin git@github.com:your-org/my-product.git
```

At this point you have a Git-backed project that LLPM can work with.

### 2. Start LLPM

In the LLPM directory you cloned earlier, start the CLI (use either Bun or npm):

```bash
cd /path/to/llpm
bun start        # or: npm run start
```

You will see the LLPM prompt in your terminal.

### 3. Let LLPM discover your project

From the LLPM prompt, scan for projects under the directory where you keep your Git repositories. For example, if you keep projects in `~/code`, make sure `my-product` lives somewhere under that directory, then run:

```text
> /project scan
> /project list
```

LLPM lists any Git repositories it finds. When you see `my-product` in the list, switch to it:

```text
> /project switch my-product
```

`my-product` is now the active project for LLPM commands.

### 4. Use LLPM in your project

With `my-product` selected as the current project, you can start using LLPM to manage product work around that repository.

Capture notes about the project:

```text
> /notes add
```

List existing notes:

```text
> /notes list
```

Run a guided skill to help with common product tasks, such as writing user stories:

```text
> /skills list
> /skills show user-story-template
```

If you configured `GITHUB_TOKEN` in your `.env` file and your `my-product` repository is connected to GitHub, LLPM will use that token when working with GitHub issues and pull requests associated with the active project.

From here you can explore other commands such as:

```text
/project list
/project switch
/model providers
/model list
/model switch
/skills reinstall
```

These let you organize projects, change which LLM models you use, and keep your skills up to date as your workflows evolve.

<!-- homepage: keep this page pure Markdown (no Hugo shortcodes) -->
