---
title: Installation
weight: 1
---

## Prerequisites

- [Bun](https://bun.sh) runtime (latest version recommended)
- [Git](https://git-scm.com)
- At least one AI provider API key

## Install the package

1. Install LLPM globally:

   ```bash
   bun add -g llpm
   ```

2. Start LLPM:

   ```bash
   llpm
   ```

## Install from source

1. Clone the repository:

   ```bash
   git clone https://github.com/britt/llpm.git
   cd llpm
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Run LLPM:

   ```bash
   bun start
   ```

## Environment variables

Create a `.env` file with at least one provider API key:

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...

# Optional: GitHub integration
GITHUB_TOKEN=ghp_...
```
