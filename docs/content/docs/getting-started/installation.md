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
