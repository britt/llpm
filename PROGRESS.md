# PROGRESS.md

## Task: Fix stale status line after project mutations (#294) - COMPLETE
- Started: 2026-02-15
- Tests: 1912 passing, 0 failing (4 new tests added)
- Build: Successful (10.36 MB bundle)
- Linting: Clean in modified files
- Version: 1.8.2 -> 1.8.3 (PATCH - bug fix)
- Completed: 2026-02-15
- Notes:
  - Status line now refreshes when /project add, /project remove, /project switch, or /project set executes
  - Root cause: ChatInterface loaded currentProject once on mount and never re-read it
  - Fix: Exposed projectSwitchTrigger from useChat, passed through index.ts to ChatInterface as prop
  - Added it as dependency on project-loading useEffect so status line re-reads after any project mutation
  - Expanded trigger condition in useChat to fire for add/remove (was only switch/set)
  - TDD: 4 tests written first and verified failing before implementation

### Files Changed
- `src/hooks/useChat.ts` - Expanded trigger condition for add/remove, exposed projectSwitchTrigger
- `src/hooks/useChat.test.ts` - 4 new tests for trigger exposure and mutation detection
- `src/components/ChatInterface.tsx` - Accept projectSwitchTrigger prop, use as useEffect dependency
- `index.ts` - Pass projectSwitchTrigger from useChat to ChatInterface
- `package.json` - Version bump to 1.8.3

## Task: Migrate 26 Tools to 5 Skills (#221) - COMPLETE
- Started: 2026-02-14
- Tests: 1908 passing, 0 failing
- Build: Successful
- Linting: Clean in modified files (1 pre-existing error in dependencyAnalyzer.ts, 188 pre-existing warnings)
- Typecheck: Clean in modified files (pre-existing errors in other test files unchanged)
- Completed: 2026-02-14
- Notes:
  - Replaced 26 specialized AI tools with 5 skills that use primitive tools
  - Updated 4 existing skills: requirement-elicitation, context-aware-questions, stakeholder-tracking, at-risk-detection
  - Created 1 new skill: project-analysis
  - Fixed architecture-diagramming skill to use get_project_scan instead of removed get_project_architecture
  - Deleted 29 files (tool implementations, services, commands, types)
  - Updated registries to remove old tool/command entries
  - Removed health/risks subcommands from /project command
  - 32 new skill migration tests verify no old tool references remain

### Skills Updated/Created
- `skills/requirement-elicitation/SKILL.md` - Fixed frontmatter format, rewrote to use primitive tools
- `skills/context-aware-questions/SKILL.md` - Added allowed-tools, rewrote content
- `skills/stakeholder-tracking/SKILL.md` - Fixed frontmatter, uses notes system for CRUD
- `skills/at-risk-detection/SKILL.md` - Added allowed-tools, kept heuristics
- `skills/project-analysis/SKILL.md` - NEW: scan/filesystem-based analysis
- `skills/architecture-diagramming/SKILL.md` - Updated tool reference

### Test Files
- `src/skills/migratedSkills.test.ts` - NEW: 32 tests for all 5 migrated skills
- `src/skills/projectPlanningSkills.test.ts` - Updated architecture-diagramming test

### Registry Files Modified
- `src/tools/registry.ts` - Removed 26+ tool imports and entries
- `src/tools/projectScanTools.ts` - Removed 4 analysis tools, kept 3 primitives
- `src/commands/registry.ts` - Removed stakeholder and issue commands
- `src/commands/project.ts` - Removed health/risks subcommands
- `src/commands/project.test.ts` - Removed health/risks test blocks

### Files Deleted (29 total)
- Tool files: elicitationTools, questionTools, stakeholderTools, riskDetectionTools (.ts + .test.ts)
- Service files: elicitationBackend, elicitationQuestions, gapAnalyzer, stakeholderBackend, riskDetectionService (.ts + .test.ts + integration tests)
- Command files: stakeholder, issue (.ts + .test.ts)
- Type files: elicitation, questions, stakeholder (.ts + .test.ts)

## Task: Fix quoted string handling in slash commands (#255) - COMPLETE
- Started: 2026-02-14T08:47:00Z
- Tests: 2183 passing, 0 failing (full suite)
- Build: Successful
- Linting: Clean (no new errors in modified files)
- Completed: 2026-02-14T11:02:00Z
- Notes:
  - Extracted `parseQuotedArgs` from stakeholder.ts to shared utility `src/utils/parseQuotedArgs.ts`
  - Integrated into `parseCommand()` in registry.ts so ALL commands benefit automatically
  - Removed duplicate local implementation from stakeholder.ts
  - Added 13 unit tests for the utility, 4 new registry tests, 2 project integration tests
  - TDD: tests written first and verified failing before implementation

### Files Changed
- `src/utils/parseQuotedArgs.ts` - New shared utility for quote-aware argument parsing
- `src/utils/parseQuotedArgs.test.ts` - 13 unit tests for the utility
- `src/commands/registry.ts` - Integrated parseQuotedArgs into parseCommand()
- `src/commands/registry.test.ts` - Fixed broken assertion, added 3 new quoted-arg tests
- `src/commands/project.test.ts` - Added 2 end-to-end integration tests
- `src/commands/stakeholder.ts` - Removed local parseQuotedArgs (now handled by registry)
- `src/commands/stakeholder.test.ts` - Updated tests to use pre-parsed arg format

## Task: Fix tilde expansion in /project add (#254) - COMPLETE
- Started: 2026-02-14
- Tests: 2172 passing, 13 skipped
- Build: Successful (10.51 MB bundle)
- Linting: Clean in modified files (pre-existing errors elsewhere unchanged)
- Completed: 2026-02-14
- Notes:
  - Added `expandPath()` utility to expand `~` to home directory and resolve relative paths
  - Applied in `addProject()` so all entry points (CLI, setup wizard, AI tool) get path expansion
  - Setup wizard now expands path before `checkPathExists` validation
  - CLI `/project add` response shows expanded path instead of raw input
  - TDD: 7 new tests written first and verified failing before implementation

### Files Changed
- `src/utils/projectConfig.ts` - Added `expandPath()`, applied in `addProject()`
- `src/utils/projectConfig.test.ts` - 7 new tests (4 for expandPath, 2 for addProject expansion, 1 cleanup)
- `src/commands/project.ts` - Show `newProject.path` (expanded) in success message
- `src/setup/steps/project.ts` - Expand path before validation
- `src/setup/steps/project.test.ts` - New test for tilde expansion in setup step

## Task: Auto-switch to newly created project (#263) - COMPLETE
- Started: 2026-02-13T15:55:00Z
- Tests: 2099 passing, 0 failing (full suite)
- Build: Successful
- Linting: Clean (no new errors in modified files)
- Completed: 2026-02-13T15:58:00Z
- Notes:
  - `addProject()` now always sets `currentProject` to the new project (not just the first one)
  - CLI `/project add` response now confirms the switch
  - AI `add_project` tool response updated to mention active project switch
  - Updated existing test that asserted old behavior (subsequent adds don't switch)
  - TDD: tests written first and verified failing before implementation

### Files Changed
- `src/utils/projectConfig.ts` - Always set currentProject on addProject
- `src/commands/project.ts` - Add switch confirmation to response
- `src/tools/projectTools.ts` - Update success message
- `src/utils/projectConfig.test.ts` - Updated test for new behavior
- `src/commands/project.test.ts` - Updated assertion for switch message
- `src/tools/projectTools.test.ts` - Updated assertion for active project message

## Task 1: Update MessageItem to render markdown for ui-notification messages - COMPLETE
- Started: 2026-01-30T16:45:00Z
- Tests: 12 passing, 0 failing
- Coverage: Logic extracted to testable pure functions with full test coverage
- Build: Successful
- Linting: Clean (no new errors in modified files)
- Completed: 2026-01-30T16:48:00Z
- Notes:
  - Extracted `getMessageDisplayContent()` and `getMessageTextColor()` as pure exported functions
  - `ui-notification` messages now render markdown (like assistant messages)
  - `ui-notification` messages no longer get "System:" prefix
  - System messages unchanged: still get "System:" prefix with no markdown
  - Tests verify the behavior difference between system and ui-notification messages
  - Fixes issue #230: /skills list shows raw markdown instead of rendered output
  - Code review fixes applied:
    - Added `isAssistantMessage` variable for consistency with other role checks
    - Fixed error handling test to properly exercise the error path using vi.resetModules() and dynamic import

### Files Changed
- `src/components/ChatInterface.tsx` - Added helper functions, refactored MessageItem
- `src/components/ChatInterface.test.ts` - New test file with 12 tests

### Test Results
All 12 new tests pass:
- getMessageDisplayContent: 6 tests
  - system messages get "System:" prefix without markdown
  - ui-notification messages get markdown rendering without prefix
  - user messages get "> " prefix without markdown
  - assistant messages get markdown rendering
  - terminal capability is respected
  - error handling is graceful
- getMessageTextColor: 4 tests
  - system -> #cb9774
  - ui-notification -> #cb9774
  - user -> white
  - assistant -> brightWhite
- ui-notification vs system: 2 tests
  - behavior differs correctly
  - color is shared

## Task 2: Issue #262 - Rework build to eliminate compiled binary dependency - COMPLETE
- Started: 2026-02-13
- Tests: 2094 passing, 13 skipped (all pre-existing skips)
- Build: Successful (9.85 MB JS bundle, 2447 modules)
- Linting: Clean in modified files (pre-existing warnings elsewhere unchanged)
- Typecheck: Clean in modified files (pre-existing errors elsewhere unchanged)
- npm pack: Verified - 25 files, 1.9 MB compressed
- Version: 1.6.0 → 1.7.0 (MINOR bump - new distribution method)
- Completed: 2026-02-13
- Notes:
  - Replaced `bun build --compile` (platform-specific binary) with `bun build --target=node` (universal JS bundle)
  - Eliminated postinstall binary download, checksum verification, and platform detection
  - Replaced Bun shell API (`import { $ } from 'bun'`) with Node's `child_process.exec` in shellExecutor
  - Rewrote `bin/llpm.cjs` from 89-line binary spawner to 2-line ESM import wrapper
  - Added `findPackageRoot()` for robust LLPM_ROOT detection in bundled mode
  - Removed `import.meta.main` guard that blocked execution when loaded via `import()`
  - Fixed `parcelRequire` compatibility with `--banner 'var parcelRequire;'` build flag
  - Updated CI workflows for bundle-based testing (Node 18/20/22 compat)
  - Updated npm-publish workflow to build before publish

### Files Changed
- `package.json` - Build script, version 1.7.0, files array, prepublishOnly script
- `src/services/shellExecutor.ts` - Replaced Bun shell with child_process.exec
- `src/services/shellExecutor.test.ts` - Mock child_process instead of bun
- `src/tools/shellTools.test.ts` - Mock child_process instead of bun
- `src/utils/config.ts` - findPackageRoot() for bundle-safe LLPM_ROOT
- `src/utils/config.test.ts` - Added getLLPMRoot tests
- `index.ts` - Removed import.meta.main guard, fixed telemetry version
- `bin/llpm.cjs` - Rewrote as 2-line ESM import wrapper
- `vitest.config.ts` - Removed bun mock alias
- `.github/workflows/npm-publish.yml` - Added Bun setup and build steps
- `.github/workflows/install-test.yml` - Complete rewrite for bundle testing

### Files Deleted
- `scripts/postinstall.cjs` - No longer needed (no binary download)
- `checksums.json` - No longer needed (no binary verification)
- `bin/llpm-macos-arm64.tar.gz` - No longer needed (no compiled binary)
- `test/mocks/bun.js` - No longer needed (no bun import to mock)

## Task 3: Issue #263 - Auto-switch to newly created project - COMPLETE
- Started: 2026-02-13
- Tests: 2099 passing, 13 skipped
- Coverage: Lines/Functions/Branches/Statements all meet thresholds
- Build: Successful (10.49 MB bundle)
- Linting: Clean in modified files (pre-existing warnings unchanged)
- Completed: 2026-02-13
- Notes:
  - `addProject()` now always sets newly created project as active (was first-project-only)
  - `/project add` response includes switch confirmation message
  - `add_project` AI tool response updated to mention active project
  - Updated VERIFICATION_PLAN.md with auto-switch scenarios (Scenarios 7-8)
  - Found and fixed root cause of docs/ deletion bug (elicitationTools.test.ts)

### Files Changed
- `src/utils/projectConfig.ts` - Always set `config.currentProject` in `addProject()`
- `src/utils/projectConfig.test.ts` - Updated test expectations for new behavior
- `src/commands/project.ts` - Added switch confirmation to `/project add` response
- `src/commands/project.test.ts` - Updated test for active project message
- `src/tools/projectTools.ts` - Updated tool response message
- `src/tools/projectTools.test.ts` - Updated test for active project message
- `VERIFICATION_PLAN.md` - Added Scenario 8 (auto-switch), updated Scenario 7
- `CLAUDE.md` - Updated scenario count reference
- `src/tools/elicitationTools.test.ts` - Fixed docs/ deletion bug (used temp dir instead)
- `.gitignore` - Added test temp directory pattern

## Task 4: Issue #265 - Setup Wizard Command - COMPLETE
- Started: 2026-02-14
- Tests: 2156 passing, 13 skipped (all pre-existing skips)
- Coverage: Setup module: 100% statements, 100% functions, 96.66% branches
- Build: Successful (10.51 MB JS bundle, 2831 modules)
- Linting: Clean in modified files (pre-existing errors elsewhere unchanged)
- Version: 1.7.1 → 1.8.0 (MINOR bump - new setup command feature)
- Completed: 2026-02-14
- Notes:
  - Added `llpm setup` command with 6-step interactive wizard
  - Steps: welcome banner, API key configuration, model selection, GitHub token, Arcade key, first project creation
  - Readline-based prompts with validation and retry logic
  - Process exits after setup completes (does not fall through to Ink UI)
  - Repository input normalized to full URL; github_repo field correctly populated
  - Google Vertex AI prompt correctly asks for "Project ID" instead of "API key"
  - Deleted Hugo documentation site (29 files)

### Files Added
- `src/setup/wizard.ts` - Setup orchestrator
- `src/setup/wizard.test.ts` - 10 tests
- `src/setup/prompts.ts` - Readline prompt helpers
- `src/setup/prompts.test.ts` - 13 tests
- `src/setup/steps/welcome.ts` - Welcome banner step
- `src/setup/steps/welcome.test.ts` - 3 tests
- `src/setup/steps/apiKeys.ts` - AI provider API key configuration
- `src/setup/steps/apiKeys.test.ts` - 7 tests
- `src/setup/steps/modelSelection.ts` - Default model selection
- `src/setup/steps/modelSelection.test.ts` - 5 tests
- `src/setup/steps/githubToken.ts` - GitHub token setup with gh CLI detection
- `src/setup/steps/githubToken.test.ts` - 6 tests
- `src/setup/steps/arcadeKey.ts` - Arcade API key configuration
- `src/setup/steps/arcadeKey.test.ts` - 4 tests
- `src/setup/steps/project.ts` - First project creation
- `src/setup/steps/project.test.ts` - 9 tests

### Files Modified
- `index.ts` - Added setup command handler with process.exit(0)
- `package.json` - Version bump to 1.8.0
