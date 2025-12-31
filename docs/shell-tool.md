# Shell Tool

The shell tool allows LLPM to execute shell commands in project directories.

## Security

**Shell execution is disabled by default.** To enable it, create a global config file:

```bash
echo '{"enabled": true}' > ~/.llpm/shell.json
```

## Configuration

Create `~/.llpm/shell.json` (global configuration):

```json
{
  "enabled": true,
  "allowedCommands": ["git", "npm", "bun", "yarn"],
  "deniedCommands": ["rm -rf", "sudo"],
  "defaultTimeout": 30000,
  "maxTimeout": 300000,
  "auditEnabled": true
}
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable shell execution |
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
[uses run_shell_command with "git status"]
```

## Audit Logs

When `auditEnabled` is true, all commands are logged to:
`~/.llpm/audit/shell-audit-YYYY-MM-DD.jsonl`

Each entry contains:
- timestamp
- command executed
- working directory
- exit code
- duration
- project ID
