---
title: Installation
weight: 1
---

## Prerequisites

- [Bun](https://bun.sh) runtime (latest version recommended)
- [Node.js](https://nodejs.org) v18 or later
- [Git](https://git-scm.com) for cloning the repository
- At least one AI provider API key

## Install via npm

You can install LLPM globally as a CLI using npm:

```bash
npm install -g @britt/llpm
llpm
```

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

   If Bun blocks `postinstall` scripts for untrusted packages, add `@britt/llpm` to `trustedDependencies` in your global `~/.bunfig.toml`.

   Example:

   ```toml
   [install]
   trustedDependencies = ["@britt/llpm"]
   ```

3. **Configure environment**

   Create a `.env` file with your API keys (see [Environment Variables](#environment-variables) below).

4. **Make it executable (optional)**

   ```bash
   chmod +x index.ts
   ```

### Notes

- Requires Node.js v18 or later (consistent with the prerequisites above).
- Environment variables are still required; configure them as described in [Environment Variables](#environment-variables).
- In environments that restrict `postinstall` scripts, ensure that scripts from `@britt/llpm` are allowed so that all tooling is set up correctly.

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
