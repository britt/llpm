# Remove Docker Infrastructure & Refocus on PM Agent

**Date:** 2025-12-30
**Status:** Approved
**Version Bump:** MAJOR

## Summary

Remove the Docker-based agent orchestration infrastructure from LLPM and refocus the project as a Product Management Agent. The core value proposition shifts from "multi-agent orchestration" to "AI-powered PM assistant for issue tracking, requirements, and project management."

## Goals

1. **Simplify architecture** - Remove complex Docker orchestration layer
2. **Sharpen focus** - PM Agent for issue tracking and requirements assistance
3. **Reduce maintenance** - Eliminate ~120KB of orchestration code
4. **Clarify purpose** - LLPM = LLM-powered Product Manager, not agent orchestrator

## Core PM Agent Capabilities (Retained)

### Primary Features
- **Issue/Project Tracking** - Create, manage, and track GitHub issues & project boards
- **Requirements Assistant** - Help define features, write PRDs, break down work into tasks
- **Output workflow** - PRDs as markdown docs, then decompose into GitHub issues

### Supporting Features
- **Code Awareness** - Local project scanning for context (file structure, languages, metrics)
- **Notes System** - Capture ideas, decisions, meeting notes
- **Skills System** - Custom workflow definitions
- **Web Content Tools** - Research competitor products, reference docs, screenshots
- **Model Switching** - Support for OpenAI, Anthropic, Groq, Google providers
- **OpenTelemetry** - Tracing for debugging and observability

## Removal Inventory

### Files/Directories to Delete

```
docker/                              # Entire directory
src/tools/restBrokerTools.ts         # 37KB - agent management tools
src/tools/restBrokerTools.test.ts    # 28KB - tests
src/commands/agents.ts               # 10KB - agent command
src/commands/agents.test.ts          # 11KB - tests
src/commands/jobs.ts                 # 8KB - job queue command
src/commands/jobs.test.ts            # 13KB - tests
src/commands/credentials.ts          # 13KB - credentials command
```

**Total removal:** ~120KB code + entire docker/ infrastructure

### Files to Edit

| File | Changes |
|------|---------|
| `src/tools/registry.ts` | Remove restBrokerTools imports & tool registrations |
| `src/commands/registry.ts` | Remove agents, jobs, credentials command registrations |
| `CLAUDE.md` | Remove Docker Container Management and Workspace Isolation sections |
| `package.json` | Update description, bump major version |

## Retained Commands

| Command | Purpose |
|---------|---------|
| `/project` | Create, switch, list PM projects |
| `/project-scan` | Analyze codebase structure |
| `/github` | GitHub authentication & status |
| `/notes` | Capture ideas, decisions, meeting notes |
| `/skills` | Custom workflow definitions |
| `/model` | Switch LLM providers |
| `/info` | Show current project & config |
| `/help` | Command reference |
| `/debug` | Troubleshooting mode |
| `/history` | Conversation history |
| `/clear`, `/quit`, `/exit` | Session management |

## Retained Tools

| Category | Tools |
|----------|-------|
| GitHub | Issues, PRs, comments, project boards, file attachments |
| Project | Create, list, scan, agent config |
| Filesystem | Read, write, list files |
| Web | Read pages, summarize, screenshots |
| Notes | Create, search, list notes |
| Skills | Load, manage skills |
| System | Ask user questions |
| Search | Vector search for project context |

## Implementation Plan

### Phase 1: Remove Docker Directory
- Delete entire `docker/` folder
- Cleanest removal - no dependencies from src/

### Phase 2: Remove Source Code
1. Delete `src/tools/restBrokerTools.ts` and test file
2. Delete `src/commands/agents.ts`, `jobs.ts`, `credentials.ts` and tests
3. Update `src/tools/registry.ts`:
   - Remove all restBrokerTools imports
   - Remove tool registrations (list_agents, get_agent, check_agent_health, etc.)
4. Update `src/commands/registry.ts`:
   - Remove agents, jobs, credentials command imports and registrations

### Phase 3: Clean Up CLAUDE.md
Remove these sections:
- "Docker Container Management"
- "Workspace Isolation for Agents"
- All docker-compose examples and rebuild workflows

Keep all other sections:
- Bun usage
- Testing instructions
- TypeScript best practices
- GitHub integration
- AI tool creation rules
- Project analysis tools
- Model switching system

### Phase 4: Verify & Test
```bash
bun run typecheck    # Catch broken imports
bun run lint         # Catch unused imports
bun run test         # Verify remaining tests pass
```
Manual smoke test of core commands: `/project`, `/github`, `/notes`, `/model`

### Phase 5: Update Package Metadata
- Bump version: MAJOR (breaking change)
- Update description if needed
- Clean up coverage/ directory references to deleted files

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Stray imports in unidentified files | Low | typecheck will catch |
| Test files referencing removed code | Low | Test run will catch |
| Coverage reports with stale references | Low | Clean coverage/ dir |

## Not Changing

- OpenTelemetry setup (useful for PM agent tracing)
- Core chat loop and UI components
- LLM integration and provider support
- GitHub tools (core PM functionality)

## Future Opportunities (Post-Removal)

- Simplify README.md to focus on PM use cases
- Add PRD generation prompts/templates
- Enhance issue breakdown workflows
- Add milestone and roadmap planning features

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Remove Docker entirely | Complex infrastructure for a different use case |
| Keep project scanning | Provides useful code context for PM decisions |
| Keep OpenTelemetry | Useful for tracing PM agent operations |
| Remove credentials command | Was only for Docker agent API keys |
| Clean sweep CLAUDE.md | Git history preserves if needed |
| Major version bump | Breaking change - removes significant functionality |
