---
title: Installation
weight: 1
---

## Prerequisites

- [Bun](https://bun.sh) runtime (latest version recommended)
- [Node.js](https://nodejs.org) v18 or later
- [Git](https://git-scm.com) for cloning the repository
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

3. **Configure environment**

   Create a `.env` file with your API keys (see [Environment Variables](#environment-variables) below).

4. **Make it executable (optional)**

   ```bash
   chmod +x index.ts
   ```

## Install Globally (optional)

### Install from this repository checkout

Use this option when running LLPM from a local clone.

```bash
bun link
llpm
```

### Install from the package registry (Bun)

Bun blocks `postinstall` scripts from untrusted packages. If installing `@britt/llpm` fails for that reason, add `@britt/llpm` to Bun's `trustedDependencies` in your global `~/.bunfig.toml` before installing.

1. Add `@britt/llpm` to `~/.bunfig.toml`:

   ```toml
   [install]
   trustedDependencies = ["@britt/llpm"]
   ```

2. Install globally:

   ```bash
   bun install -g @britt/llpm
   ```

3. Run:

   ```bash
   llpm
   ```

## Verify Installation

```bash
bun start
# or if linked globally
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
```

Bun automatically loads environment variables from `.env` files.
