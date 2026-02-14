---
title: Quickstart
weight: 2
---

## Your First Session with LLPM

This quickstart walks through starting LLPM, telling it what you are trying to accomplish, and connecting it to a project. By the end, there should be an active session where LLPM understands the current goal and project context and is ready to help plan, execute, and track work.

### 1. Start LLPM

From a terminal, in the directory where you want to work (for example, a project repository), start LLPM:

```bash
llpm run
```

This command launches an interactive LLPM session. You will see a prompt where you can type messages and LLPM will respond. The session keeps running while questions are asked, plans are refined, and work progresses.

### 2. Tell LLPM what you want to achieve

The primary way to use LLPM is through natural language chat. Describe goals, constraints, and outcomes wanted just as would be explained to a teammate.

For example:

```text
llpm> I'm starting a new API service. Help me plan the first iteration, outline key milestones, and suggest an initial task breakdown.
```

LLPM will respond with a plan, ask clarifying questions if needed, and suggest next steps. Typical outcomes from this first interaction include:

- A shared understanding of the goal
- A rough plan or roadmap
- Suggestions for how LLPM can stay involved (e.g., tracking tasks, reviewing changes, preparing updates)

### 3. Connect LLPM to a project

To get the most value, give LLPM basic information about the project being worked on—repository, local path, and a short description. This can be done purely in chat:

```text
llpm> I'm working on a Node.js web app in ~/code/my-app using the repo owner/repo. Track this as a project called "My App" and help me manage issues and milestones.
```

LLPM will record this context and use it in later conversations: when planning work, summarizing progress, or preparing stakeholder updates.

If the exact parameters are known and a command-style workflow is preferred, the same thing can be expressed with a slash command:

```text
llpm> /project add "My App" "owner/repo" "~/code/my-app" "Short description of the app"
```

Both approaches are equivalent. Anything that can be done with a slash command can also be requested directly in chat; commands simply provide a concise shortcut when the syntax is already familiar.

### 4. Explore how LLPM can help on the project

Once a project is set up, LLPM can act as a project assistant. Common goals include:

- Breaking down large issues or requirements into smaller tasks
- Planning timelines and identifying dependencies and risks
- Summarizing long discussion threads or issue histories
- Drafting stakeholder updates or status reports
- Designing or refining architecture and diagrams

These interactions start with simple, goal-focused prompts such as:

```text
llpm> Given our "My App" project, help me break down the next two weeks of work into concrete issues and milestones.
```

or:

```text
llpm> Review the open issues for "My App" and identify anything that looks at risk for this milestone.
```

LLPM will reference the project context set earlier, propose actions, and can help refine plans iteratively as decisions are made.

If specific commands are ever needed, they can be requested in plain language:

```text
llpm> Show me the available commands and when they are useful.
```

If preferred, a traditional command listing is available:

```text
llpm> /help
```

Remember: chat is the primary interface. Slash commands are optional shortcuts layered on top of the same capabilities.

### 5. Finish the session

When done with the current session, exit LLPM in one of two ways:

- Press `Ctrl+C` in the terminal
- Type `exit` or the `/exit` command at the prompt

LLPM will terminate the interactive session, and it can be restarted at any time with `llpm run`.

## Next Steps

To go beyond this quickstart:

- [Configuration](../configuration) – Configure API keys, default models, and other settings.
- [User Guide](/docs/user-guide) – Learn in depth how LLPM manages projects, context, and workflows.
- [Skills](/docs/skills-reference) – Explore the skills system LLPM uses to perform structured tasks like planning, triaging, and summarizing.

