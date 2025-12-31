# Shell Tool

The shell tool allows LLPM to execute shell commands in project directories.

## Security

**Shell execution is disabled by default.** The tool also requires explicit user confirmation before executing any command.

To enable shell execution, add a `shell` section to your global config:

```bash
# Edit ~/.llpm/config.json and add:
{
  "shell": {
    "enabled": true
  }
}
```

## Confirmation Flow

When the AI wants to run a shell command, it will:

1. Show you the exact command it wants to run
2. Show the working directory
3. Ask for your explicit approval
4. Only execute after you confirm with "yes" or "approved"

Example:
```
**Shell Command Confirmation Required**

I want to run the following command:

```
git status
```

**Working directory:** /Users/you/project

Please confirm you want me to execute this command. Reply with "yes" or "approved" to proceed, or "no" to cancel.
```

### Skip Confirmation Mode

If you trust the AI and want commands to execute immediately without confirmation, enable `skipConfirmation`:

```json
{
  "shell": {
    "enabled": true,
    "skipConfirmation": true
  }
}
```

Even with `skipConfirmation` enabled, the AI will still display what command is being executed:

```
**Executing shell command:**

```
git status
```

**Working directory:** /Users/you/project
```

## Configuration

Add a `shell` section to `~/.llpm/config.json`:

```json
{
  "shell": {
    "enabled": true,
    "allowedCommands": ["git", "npm", "bun", "yarn"],
    "deniedCommands": ["rm -rf", "sudo"],
    "defaultTimeout": 30000,
    "maxTimeout": 300000,
    "auditEnabled": true
  }
}
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable shell execution |
| `skipConfirmation` | boolean | `false` | Skip confirmation prompt (still shows command) |
| `allowedCommands` | string[] | `[]` | Command prefixes to allow (empty = all) |
| `deniedCommands` | string[] | `[...]` | Commands to always deny |
| `defaultTimeout` | number | `30000` | Default timeout in ms |
| `maxTimeout` | number | `300000` | Maximum allowed timeout |
| `allowedPaths` | string[] | `[]` | Extra paths where commands can run |
| `auditEnabled` | boolean | `true` | Log all commands to audit |

### Default Denied Commands

The following commands are denied by default for security:
- `rm -rf /`
- `sudo`
- `su `
- Fork bombs (`:(){ :|:& };:`)

## Usage

The AI can use the shell tool like this:

```
User: What's the git status of this project?
AI: I'll check the git status for you.
[Shows confirmation prompt with "git status" command]
User: yes
[Executes and returns output]
```

## Audit Logs

When `auditEnabled` is true, all executed commands are logged to:
`~/.llpm/audit/shell-audit-YYYY-MM-DD.jsonl`

Each entry contains:
- timestamp
- command executed
- working directory
- exit code
- duration
- project ID
