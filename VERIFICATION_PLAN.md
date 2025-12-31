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

### Scenario 7: Project Management

**Context**: No projects configured (fresh state).

**Steps**:
1. Run `/project list` - should show no projects
2. Run `/project add "Test Project" "owner/test-repo" "/tmp/test-project" "A test project"`
3. Run `/project list` - should show the new project
4. Run `/project switch <project-id>` using the ID from step 3
5. Run `/project` - should show current project details
6. Run `/project remove <project-id>` to clean up

**Success Criteria**:
- [ ] Empty project list handled gracefully
- [ ] Project created with correct details
- [ ] Project appears in list with all fields
- [ ] Project switch succeeds
- [ ] Current project shows correct info
- [ ] Project removal succeeds

**If Blocked**: Check project config file permissions

---

### Scenario 8: Streaming Response

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

# 4. Exit
/exit
```

**Pass criteria**: All commands return without errors, AI responds to message.
