# LLPM Verification Plan

Real-world acceptance testing procedures for validating LLPM works in production scenarios.

## Prerequisites

Before running verification:

- [ ] **API Keys Configured**: Ensure `.env` has valid keys for at least one AI provider:
  - `OPENAI_API_KEY` - for OpenAI models
  - `ANTHROPIC_API_KEY` - for Anthropic models
  - `GROQ_API_KEY` - for Groq models
  - `GOOGLE_VERTEX_PROJECT_ID` - for Google Vertex AI
- [ ] **GitHub Token**: `GITHUB_TOKEN` or `GH_TOKEN` set with repo access
- [ ] **Test Repository**: A GitHub repository available for testing issue/PR creation
- [ ] **Skills Directory**: At least one skill file in `~/.llpm/skills/` or project `.skills/`
- [ ] **LLPM Running**: Start with `bun run start` or `bun run dev`

---

## Scenarios

### Scenario 1: AI Chat Responds

**Context**: LLPM is running with at least one AI provider configured.

**Steps**:
1. Start LLPM: `bun run start`
2. Type a simple prompt: "What is 2 + 2?"
3. Wait for AI response
4. Verify response appears and is coherent

**Success Criteria**:
- [ ] LLPM starts without errors
- [ ] AI model indicator shows current model (e.g., "gpt-4o" or "claude-sonnet")
- [ ] Response is received within 30 seconds
- [ ] Response contains "4" or equivalent answer

**If Blocked**: Check API key is valid with `/model providers`

---

### Scenario 2: Model Switching Works

**Context**: Multiple AI providers are configured.

**Steps**:
1. Run `/model` to see current model and available providers
2. Run `/model list` to see available models
3. Run `/model switch <provider>/<model>` to switch to a different model
4. Send a test message to verify the new model responds

**Success Criteria**:
- [ ] `/model` shows current model and provider status
- [ ] `/model list` displays models grouped by provider
- [ ] `/model switch` confirms successful switch
- [ ] New model responds to messages

**If Blocked**: Verify API keys for target provider are configured

---

### Scenario 3: Slash Commands Execute

**Context**: LLPM is running.

**Steps**:
1. Run `/help` - should display available commands
2. Run `/project` - should show current project or "no active project"
3. Run `/model` - should show current model info
4. Run `/skills list` - should list discovered skills or "no skills"

**Success Criteria**:
- [ ] `/help` displays command list with descriptions
- [ ] `/project` returns success (shows project or guidance)
- [ ] `/model` displays provider status
- [ ] `/skills list` returns success (with or without skills)

**If Blocked**: Check LLPM started correctly with `bun run start`

---

### Scenario 4: Skills System Loads

**Context**: At least one skill exists in a skills directory.

**Steps**:
1. Create a test skill: `mkdir -p ~/.llpm/skills/test-skill`
2. Create skill file with valid frontmatter:
   ```markdown
   ---
   name: test-skill
   description: A test skill for verification
   ---

   # Test Skill

   This is a test skill for verification purposes.
   ```
3. Run `/skills reload` in LLPM
4. Run `/skills list` to verify skill appears
5. Run `/skills test test-skill` to preview skill content

**Success Criteria**:
- [ ] `/skills reload` reports successful scan
- [ ] `/skills list` shows "test-skill" with description
- [ ] `/skills test test-skill` displays skill content and metadata

**If Blocked**: Verify skill file path is correct (`~/.llpm/skills/test-skill/SKILL.md`)

---

### Scenario 5: GitHub Repository Access

**Context**: GITHUB_TOKEN is configured with repo access.

**Steps**:
1. Run `/github list` to list user repositories
2. Run `/github search "language:typescript"` to search repos
3. Verify repository information is returned

**Success Criteria**:
- [ ] `/github list` returns list of repositories
- [ ] Each repo shows name, privacy status, and URL
- [ ] `/github search` returns relevant results
- [ ] No authentication errors occur

**If Blocked**: Verify `GITHUB_TOKEN` has `repo` scope permissions

---

### Scenario 6: AI Tool Execution (GitHub Issue Creation)

**Context**: A test GitHub repository is available, and GITHUB_TOKEN is configured.

**Steps**:
1. Ask the AI: "Create a test issue in [owner/repo] titled 'Verification Test' with body 'This is a test issue created by LLPM verification'"
2. Wait for AI to use the `create_github_issue` tool
3. Verify issue was created by checking the repository

**Success Criteria**:
- [ ] AI understands the request and calls the appropriate tool
- [ ] Issue is created in the specified repository
- [ ] Issue title and body match the request
- [ ] AI reports success with issue URL

**If Blocked**: Ensure test repo exists and token has write access

---

### Scenario 7: Project Management (with auto-switch)

**Context**: No projects configured (fresh state).

**Steps**:
1. Run `/project list` - should show no projects
2. Run `/project add "Test Project" "owner/test-repo" "/tmp/test-project" "A test project"`
3. Verify response includes "Switched active project to" confirmation
4. Run `/project` - should show "Test Project" as current (no manual switch needed)
5. Run `/project add "Second Project" "owner/second-repo" "/tmp/second-project" "Another project"`
6. Verify response includes "Switched active project to" for "Second Project"
7. Run `/project` - should show "Second Project" as current (auto-switched)
8. Run `/project switch <first-project-id>` - explicit switch still works
9. Run `/project` - should show "Test Project" as current
10. Run `/project remove <second-project-id>` to clean up
11. Run `/project remove <first-project-id>` to clean up

**Success Criteria**:
- [ ] Empty project list handled gracefully
- [ ] First project created with correct details
- [ ] Response confirms auto-switch to first project
- [ ] `/project` shows first project as current without explicit switch
- [ ] Second project created with correct details
- [ ] Response confirms auto-switch to second project
- [ ] `/project` shows second project as current (auto-switched from first)
- [ ] Explicit `/project switch` still works
- [ ] Project removal succeeds

**If Blocked**: Check project config file permissions

---

### Scenario 8: Auto-Switch on Project Creation

**Context**: At least one project already exists and is set as the active project.

**Steps**:
1. Run `/project add "First Project" "owner/first-repo" "/tmp/first" "First project"` to ensure a project exists
2. Run `/project` - verify "First Project" is active
3. Run `/project add "Second Project" "owner/second-repo" "/tmp/second" "Second project"`
4. Verify response contains "Switched to" and "Second Project"
5. Run `/project` - should show "Second Project" as the active project
6. Run `/project list` - "Second Project" should be marked as current
7. Ask the AI: "What is the current project?" - AI should report "Second Project" via the `get_current_project` tool
8. Clean up: `/project remove <second-project-id>` then `/project remove <first-project-id>`

**Success Criteria**:
- [ ] Creating a second project automatically switches active project away from the first
- [ ] `/project add` response explicitly confirms the switch
- [ ] `/project` shows the newly created project as active without manual `/project switch`
- [ ] `/project list` marks the new project as current
- [ ] AI tool `get_current_project` returns the newly created project
- [ ] Explicit `/project switch` still works to switch back to the first project

**If Blocked**: Check `~/.llpm/config.json` to verify `currentProject` field is being updated

---

### Scenario 9: Streaming Response

**Context**: LLPM is running with AI configured.

**Steps**:
1. Ask a question requiring a longer response: "Explain the benefits of test-driven development in 3 paragraphs"
2. Observe that response streams in progressively (not all at once)
3. Wait for complete response

**Success Criteria**:
- [ ] Response text appears progressively (streaming visible)
- [ ] Response completes without errors
- [ ] Markdown formatting renders correctly
- [ ] Can interrupt with Ctrl+C if needed

**If Blocked**: This is expected behavior - if response appears all at once, streaming may not be working

---

### Scenario 10: History Viewer Opens and Displays Messages

**Context**: LLPM is running with at least 5 messages in conversation history (send a few messages to the AI first).

**Steps**:
1. Send at least 5 messages to the AI so conversation history exists (e.g., "Hello", "What is 2+2?", "Tell me a joke", etc.)
2. Run `/history`
3. Observe the history viewer opens as a full-screen overlay
4. Verify messages are displayed with role labels (user/assistant) and content
5. Press `q` to close the viewer
6. Verify the chat UI resumes normally

**Success Criteria**:
- [ ] `/history` opens a full-screen viewer (replaces the chat UI)
- [ ] Viewer shows a header with "History" title
- [ ] Messages display with role labels (user, assistant)
- [ ] Message content is fully visible (not truncated)
- [ ] Keybinding hints are visible at the bottom
- [ ] Pressing `q` closes the viewer and returns to normal chat
- [ ] After closing, chat input is functional again

**If Blocked**: Check that the `/history` command returns an interactive result with `type: 'history-view'`

---

### Scenario 11: History Viewer with Message Count Arguments

**Context**: LLPM is running with at least 10 messages in conversation history.

**Steps**:
1. Ensure at least 10 messages exist in history
2. Run `/history 3` — should show only the last 3 messages
3. Press `q` to close
4. Run `/history all` — should show all messages in history
5. Press `q` to close
6. Run `/history` (no args) — should show last 20 messages (or all if fewer than 20)

**Success Criteria**:
- [ ] `/history 3` shows exactly 3 messages (the most recent ones)
- [ ] `/history all` shows all messages in the conversation
- [ ] `/history` (default) shows up to 20 messages
- [ ] Message count indicator in header matches expected count
- [ ] Each variant opens and closes cleanly

**If Blocked**: Run `/history help` to confirm command syntax

---

### Scenario 12: History Viewer Keyboard Navigation

**Context**: History viewer is open with enough messages to require scrolling (at least 20+ messages, or messages with enough content to overflow the terminal height).

**Steps**:
1. Build up history with at least 20 messages (ask the AI several questions)
2. Run `/history all`
3. Press `↓` arrow — view should scroll down one line
4. Press `↑` arrow — view should scroll up one line
5. Press `Page Down` — view should scroll down one page
6. Press `Page Up` — view should scroll up one page
7. Press `End` — view should jump to the last message
8. Press `Home` — view should jump to the first message
9. Press `Esc` — viewer should close

**Success Criteria**:
- [ ] `↑`/`↓` scrolls one line at a time
- [ ] `Page Up`/`Page Down` scrolls by a full page
- [ ] `Home` jumps to the beginning (first message visible)
- [ ] `End` jumps to the end (last message visible)
- [ ] `Esc` closes the viewer (same as `q`)
- [ ] Scroll position indicator updates as you navigate

**If Blocked**: Ensure terminal supports raw input mode (required for arrow key detection)

---

### Scenario 13: History Viewer Search

**Context**: History viewer is open with messages containing searchable content.

**Steps**:
1. Send a few distinct messages to the AI, including one containing the word "elephant" (e.g., "Tell me a fact about elephants")
2. Wait for AI responses
3. Run `/history all`
4. Press `/` to enter search mode
5. Type `elephant`
6. Observe search results: match count should appear, viewer should jump to first match
7. Press `Enter` to confirm search
8. Press `n` to jump to the next match
9. Press `N` to jump to the previous match
10. Press `/` again, then `Esc` to cancel search
11. Press `q` to close viewer

**Success Criteria**:
- [ ] `/` activates search mode (search bar appears at bottom)
- [ ] Typing a query shows match count (e.g., "1 of 3")
- [ ] Viewer auto-scrolls to first match
- [ ] `Enter` exits search mode but preserves the query
- [ ] `n` jumps to next match
- [ ] `N` jumps to previous match
- [ ] `Esc` in search mode cancels search and clears query
- [ ] Searching for a term with no matches shows "No matches"

**If Blocked**: Ensure messages actually contain the search term by checking `/history all` content first

---

### Scenario 14: History Viewer with Empty History

**Context**: LLPM is running with a freshly cleared history.

**Steps**:
1. Run `/clear` to clear conversation history
2. Run `/history`
3. Observe the response

**Success Criteria**:
- [ ] `/history` handles empty history gracefully (no crash)
- [ ] A message like "No messages in history" is displayed
- [ ] User can still return to normal chat

**If Blocked**: If `/clear` doesn't work, start LLPM fresh with a new session

---

### Scenario 15: History Viewer with Timestamps

**Context**: LLPM is running and new messages have been sent (messages created after the timestamp feature is implemented).

**Steps**:
1. Send a new message: "Testing timestamps"
2. Wait for AI response
3. Run `/history 2`
4. Observe the message labels in the viewer

**Success Criteria**:
- [ ] New messages show a timestamp in `HH:MM:SS` format (e.g., `[14:32:15]`)
- [ ] Old messages without timestamps show an index number (e.g., `[#1]`)
- [ ] Timestamps are consistent with the actual time the message was sent
- [ ] Both formats are visually clear and readable

**If Blocked**: Check if messages in the conversation state have a `timestamp` field by examining AI tool debug output

---

### Scenario 16: History Help Subcommand

**Context**: LLPM is running.

**Steps**:
1. Run `/history help`
2. Observe the output

**Success Criteria**:
- [ ] Help text displays all available subcommands (`/history`, `/history all`, `/history N`, `/history help`)
- [ ] Navigation keybindings are documented (scroll, search, quit)
- [ ] Output is well-formatted and readable

**If Blocked**: Check command is registered in the command registry

---

## Verification Rules

- **Never use mocks or fakes** - all tests use real APIs and services
- **Test environment is acceptable** - using a test GitHub repo is fine
- **If any success criterion fails, verification fails** - partial success is failure
- **Ask developer for help if blocked** - don't guess or skip scenarios
- **Document all observations** - record what actually happened

---

## Verification Log Template

After running verification, document results:

```markdown
## Verification Log - [Date/Time]

### Environment
- LLPM Version: [version from package.json]
- AI Provider: [which provider was tested]
- Platform: [macOS/Linux/Windows]

### Scenarios Executed

#### Scenario 1: AI Chat Responds
**Status**: PASS / FAIL / BLOCKED
- Step 1: [observation]
- Step 2: [observation]
- Criteria met: [list which passed/failed]

[Repeat for each scenario]

### Summary
- Scenarios: X passed, Y failed, Z blocked
- Overall: PASS / FAIL
- Issues found: [list any problems]
```

---

## Quick Verification (Smoke Test)

For rapid validation, run these minimum checks:

```bash
# 1. Start LLPM
bun run start

# 2. In LLPM, run these commands:
/help
/model
/skills list
/github list

# 3. Send a test message:
"Hello, what model are you?"

# 4. Test history viewer:
/history
# (viewer should open — press q to close)

# 5. Exit
/exit
```

**Pass criteria**: All commands return without errors, AI responds to message, history viewer opens and closes cleanly.
