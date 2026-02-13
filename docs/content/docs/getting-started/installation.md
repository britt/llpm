---
title: Installation
weight: 1
---

## Prerequisites

- [Node.js](https://nodejs.org) v18 or later
- Optional: [Bun](https://bun.sh) runtime (latest version recommended)
- [Git](https://git-scm.com) for cloning the repository
- At least one AI provider API key

## Install globally

From npm (recommended):

```bash
npm install -g @britt/llpm
```

With Bun:

1. Add `@britt/llpm` to `trustedDependencies` in `~/.bunfig.toml`.

   ```toml
   [install]
   trustedDependencies = ["@britt/llpm"]
   ```

2. Install:

   ```bash
   bun install -g @britt/llpm
   ```

After installation, run `llpm` to start the CLI.

## Install from Source

1. **Clone the repository**

   ```bash
   git clone https://github.com/britt/llpm.git
   cd llpm
   ```

2. **Install dependencies**

   With Bun:

   ```bash
   bun install
   ```

   If Bun blocks `postinstall` scripts for untrusted packages, add `@britt/llpm` to `trustedDependencies` in `~/.bunfig.toml`.

   Example:

   ```toml
   [install]
   trustedDependencies = ["@britt/llpm"]
   ```

   With npm:

   ```bash
   npm install
   ```

3. **Configure environment**

   Create a `.env` file with your API keys (see [Environment Variables](#environment-variables) below).

4. **Make it executable (optional)**

   ```bash
   chmod +x index.ts
   ```

## Verify Installation

```bash
bun start
# or
npm run start
# or (if installed globally)
llpm
```

You should see the LLPM welcome screen and prompt.

## Environment Variables

Create a `.env` file in the project root with your AI provider API keys:

```bash
# At least one AI provider is required
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...

# Optional: GitHub integration
GITHUB_TOKEN=ghp_...

# Optional: Web search
ARCADE_API_KEY=your-arcade-api-key-here
```

Bun automatically loads environment variables from `.env` files.
