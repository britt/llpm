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
- [ ] **Network Access**: Internet access to github.com (required for marketplace scenarios 10-18)
- [ ] **Git Installed**: `git` available on PATH (required for marketplace sync/install)
- [ ] **Test Marketplace Repos**: These public repos must be accessible:
  - `obra/superpowers` — skill collection
  - `anthropics/skills` — Anthropic's skills repo
  - `phuryn/pm-skills` — PM skills collection
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

### Scenario 10: Register Marketplace Repos

**Context**: LLPM is running. Network access to GitHub is available. No marketplaces are registered.

**Steps**:
1. Run `/skills marketplace list` — should show no marketplaces
2. Run `/skills marketplace add obra/superpowers` — register first marketplace
3. Run `/skills marketplace add anthropics/skills` — register second marketplace
4. Run `/skills marketplace add phuryn/pm-skills` — register third marketplace
5. Run `/skills marketplace list` — should show all three

**Success Criteria**:
- [ ] Empty marketplace list handled gracefully (no error, clear message)
- [ ] Each `/skills marketplace add` confirms registration with repo name
- [ ] `/skills marketplace list` shows all three marketplaces with names and repos:
  - `obra-superpowers` → `obra/superpowers`
  - `anthropics-skills` → `anthropics/skills`
  - `phuryn-pm-skills` → `phuryn/pm-skills`
- [ ] Registering an already-registered repo returns a clear duplicate error
- [ ] `~/.llpm/config.json` contains a `marketplaces` array with three entries

**If Blocked**: Check network access to github.com. Verify `GITHUB_TOKEN` or `GH_TOKEN` is set.

---

### Scenario 11: Sync Marketplace Indexes

**Context**: Three marketplaces are registered (from Scenario 10). Network access available.

**Steps**:
1. Run `/skills sync obra-superpowers` — sync index from obra/superpowers
2. Run `/skills sync anthropics-skills` — sync index from anthropics/skills
3. Run `/skills sync phuryn-pm-skills` — sync index from phuryn/pm-skills
4. Verify cached index files exist at `~/.llpm/cache/marketplaces/<name>/index.json`

**Success Criteria**:
- [ ] Each sync completes without errors and reports number of skills found
- [ ] `obra-superpowers` index contains skills (check: `cat ~/.llpm/cache/marketplaces/obra-superpowers/index.json`)
- [ ] `anthropics-skills` index contains skills
- [ ] `phuryn-pm-skills` index contains skills
- [ ] Each index entry has `name`, `description`, and `marketplace` fields
- [ ] Syncing a non-existent marketplace name returns a clear error

**If Blocked**: Verify git is installed and repos are public. Try `git ls-remote https://github.com/obra/superpowers` to confirm access.

---

### Scenario 12: Search Across Marketplaces

**Context**: All three marketplaces are synced (from Scenario 11).

**Steps**:
1. Run `/skills search planning` — should match skills related to planning
2. Run `/skills search review` — should match code review or similar skills
3. Run `/skills search nonexistent-xyz-12345` — should return no results
4. Run `/skills search` (no query) — should list all available skills from all marketplaces

**Success Criteria**:
- [ ] Search results show skill name, description, and which marketplace it belongs to
- [ ] Results span multiple marketplaces when matches exist in more than one
- [ ] Empty search query lists all skills from all synced marketplaces
- [ ] No-results query shows a clear "no skills found" message
- [ ] Results include an install hint (e.g., "Install with: `/skills install <name>@<marketplace>`")

**If Blocked**: Verify indexes are cached. Run `/skills sync` for each marketplace.

---

### Scenario 13: Install Skill from Marketplace

**Context**: Marketplaces are synced. No marketplace skills are installed yet.

**Steps**:
1. Run `/skills search` to find a skill from `obra-superpowers` (pick one that does NOT conflict with bundled skills)
2. Run `/skills install <skill-name>@obra-superpowers` — install it
3. Run `/skills list` — verify the installed skill appears with marketplace provenance
4. Run `/skills test <skill-name>` — verify skill content loaded correctly
5. Repeat: install a skill from `anthropics-skills`
6. Repeat: install a skill from `phuryn-pm-skills`

**Success Criteria**:
- [ ] Install completes without errors and reports success
- [ ] Skill directory created at `~/.llpm/skills/<skill-name>/SKILL.md`
- [ ] `/skills list` shows the skill under "Marketplace Skills" section with marketplace name
- [ ] `/skills test <skill-name>` displays valid skill content and metadata
- [ ] `~/.llpm/config.json` `installedSkills` array tracks provenance (name, marketplace, repo, installedAt)
- [ ] Installing a skill that doesn't exist in the marketplace returns a clear error
- [ ] Installing from a non-existent marketplace returns a clear error

**If Blocked**: Verify the marketplace has skills matching the Agent Skills spec (SKILL.md with frontmatter). Try a different skill.

---

### Scenario 14: Skill Install Conflict and Resolution

**Context**: Bundled skill `user-story-template` exists. `phuryn/pm-skills` marketplace is synced and contains a skill that overlaps.

**Steps**:
1. Run `/skills list` — confirm `user-story-template` exists as a bundled/user skill
2. Run `/skills install user-story-template@phuryn-pm-skills` (or the equivalent skill name from pm-skills)
3. Observe conflict prompt — should warn that `user-story-template` already exists and ask for confirmation
4. Decline the install — skill should remain unchanged
5. Run `/skills install --force user-story-template@phuryn-pm-skills` — force install
6. Run `/skills list` — verify the skill now shows marketplace provenance
7. Run `/skills test user-story-template` — verify content is from the marketplace version

**Success Criteria**:
- [ ] Conflict detected: response clearly states skill already exists and shows existing path
- [ ] Response suggests using `--force` to overwrite
- [ ] Without `--force`, the existing skill is NOT overwritten
- [ ] With `--force`, the marketplace version replaces the existing one
- [ ] After force install, `/skills list` shows the skill with marketplace source
- [ ] `/skills test` confirms content matches the marketplace version, not the original
- [ ] Skill still functions correctly after overwrite (enable/disable works)

**If Blocked**: If `phuryn/pm-skills` doesn't have a conflicting skill name, use `anthropics/skills` instead, or manually create a bundled skill with a matching name first.

---

### Scenario 15: Remove Installed Skill

**Context**: At least one marketplace skill is installed (from Scenario 13).

**Steps**:
1. Run `/skills list` — note an installed marketplace skill
2. Run `/skills remove <skill-name>` — remove the skill
3. Run `/skills list` — verify it no longer appears
4. Check `~/.llpm/config.json` — `installedSkills` should no longer contain the removed skill
5. Verify directory `~/.llpm/skills/<skill-name>/` is deleted

**Success Criteria**:
- [ ] Remove completes with success message
- [ ] Skill no longer appears in `/skills list`
- [ ] `installedSkills` metadata entry is removed from config
- [ ] Skill directory is deleted from disk
- [ ] Removing a non-existent skill returns a clear error

**If Blocked**: Check file permissions on `~/.llpm/skills/`.

---

### Scenario 16: Remove Marketplace Registration

**Context**: Three marketplaces are registered. At least one skill was installed from one of them.

**Steps**:
1. Run `/skills marketplace remove phuryn-pm-skills`
2. Run `/skills marketplace list` — should show only two marketplaces
3. Run `/skills search` — results should NOT include skills from `phuryn-pm-skills`
4. Verify any previously installed skills from `phuryn-pm-skills` are still present on disk (removing a marketplace does not uninstall its skills)
5. Run `/skills marketplace remove nonexistent-marketplace` — should return error

**Success Criteria**:
- [ ] Marketplace removed from list
- [ ] Search no longer returns skills from removed marketplace
- [ ] Previously installed skills from that marketplace remain installed and functional
- [ ] Removing non-existent marketplace returns clear error
- [ ] `~/.llpm/config.json` `marketplaces` array updated

**If Blocked**: Check config file permissions.

---

### Scenario 17: AI Tool — Search and Install Skills

**Context**: LLPM is running with AI configured. At least one marketplace is registered and synced.

**Steps**:
1. Ask the AI: "Search for skills related to code review in the marketplace"
2. Verify AI uses the `search_marketplace_skills` tool and presents results
3. Ask the AI: "Install the <skill-name> skill from <marketplace>"
4. Verify AI uses the `install_skill` tool and reports success
5. Ask the AI: "What skills do I have installed?"
6. Verify AI uses `list_available_skills` and shows the newly installed skill

**Success Criteria**:
- [ ] AI calls `search_marketplace_skills` tool with appropriate query
- [ ] Search results are presented clearly to the user
- [ ] AI calls `install_skill` tool with correct skill name and marketplace
- [ ] Install result is reported to user with skill name
- [ ] AI can list skills including the newly installed one
- [ ] If install hits a conflict, AI communicates the conflict clearly

**If Blocked**: Verify AI provider is responding. Try `/model` to confirm.

---

### Scenario 18: Marketplace Cleanup

**Context**: Verification scenarios 10-17 have been executed. Test data needs cleanup.

**Steps**:
1. Run `/skills remove` for each marketplace-installed skill
2. Run `/skills marketplace remove` for each registered marketplace
3. If the `user-story-template` was overwritten in Scenario 14, run `/skills reinstall` to restore bundled skills
4. Run `/skills list` — should show only bundled/user skills, no marketplace skills
5. Run `/skills marketplace list` — should show no marketplaces
6. Verify `~/.llpm/config.json` has empty `marketplaces` and `installedSkills` arrays

**Success Criteria**:
- [ ] All marketplace skills removed
- [ ] All marketplaces unregistered
- [ ] Bundled skills restored if overwritten
- [ ] Config file cleaned up
- [ ] LLPM functions normally after cleanup (run `/skills list`, `/help`)

**If Blocked**: Manually edit `~/.llpm/config.json` to remove `marketplaces` and `installedSkills` keys.

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

---

## Marketplace Quick Verification (Smoke Test)

Rapid check that marketplace features work:

```bash
# 1. Start LLPM
bun run start

# 2. Register a marketplace
/skills marketplace add obra/superpowers

# 3. Sync its index
/skills sync obra-superpowers

# 4. Search for a skill
/skills search

# 5. Install a skill (pick one from search results)
/skills install <skill-name>@obra-superpowers

# 6. Verify it shows up
/skills list

# 7. Clean up
/skills remove <skill-name>
/skills marketplace remove obra-superpowers

# 8. Exit
/exit
```

**Pass criteria**: All commands return without errors. Skill installs, appears in list, and removes cleanly.
