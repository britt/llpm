import type { Command, CommandResult } from './types';
import { credentialManager } from '../utils/credentialManager';

export const credentialsCommand: Command = {
  name: 'credentials',
  description: 'Manage stored credentials and profiles',

  async execute(args: string[]): Promise<CommandResult> {
    const [action, subaction, ...rest] = args;

    if (!action) {
      return {
        success: false,
        content: `Usage: /credentials <action> [options]

**Credential Actions:**
  status                           - Show credential status for active profile
  set <provider> <key> <value>     - Set a credential in active profile
  get <provider> <key>             - Get a credential (masked) from active profile
  remove <provider> <key>          - Remove a credential from active profile
  clear                           - Clear all credentials from active profile

**Profile Actions:**
  profile list                     - List all profiles
  profile current                  - Show current and active profile
  profile create <name>            - Create a new profile
  profile switch <name>            - Switch to a profile (persistent)
  profile delete <name>            - Delete a profile
  profile clear [name]             - Clear all credentials in profile (defaults to active)

**Examples:**
  /credentials status
  /credentials set openai apiKey sk-your-openai-key
  /credentials set --profile work github token ghp-work-token
  /credentials profile create work
  /credentials profile switch work
  /credentials profile list

**Providers:**
  openai       - OpenAI (keys: apiKey)
  anthropic    - Anthropic (keys: apiKey)
  groq         - Groq (keys: apiKey)
  googleVertex - Google Vertex (keys: projectId, region)
  github       - GitHub (keys: token)
  arcade       - Arcade (keys: apiKey)

**Profile Notes:**
- Environment variables always take priority
- Use --profile <name> flag when starting LLPM to override active profile
- Credentials fallback: env vars → active profile → default profile`
      };
    }

    try {
      // Handle profile subcommands
      if (action === 'profile') {
        return await handleProfile(subaction, rest);
      }

      // Handle credential commands with optional --profile flag
      const profileFlagIndex = args.findIndex(arg => arg === '--profile');
      const targetProfile =
        profileFlagIndex !== -1 && profileFlagIndex + 1 < args.length
          ? args[profileFlagIndex + 1]
          : undefined;

      // Remove --profile and profile name from args for processing
      let cleanArgs = args;
      if (profileFlagIndex !== -1) {
        cleanArgs = [...args.slice(0, profileFlagIndex), ...args.slice(profileFlagIndex + 2)];
      }

      const [cleanAction, provider, key, ...valueParts] = cleanArgs;

      switch (cleanAction) {
        case 'status':
          return await handleStatus();
        case 'set':
          return await handleSet(provider, key, valueParts.join(' '), targetProfile);
        case 'get':
          return await handleGet(provider, key, targetProfile);
        case 'remove':
          return await handleRemove(provider, key, targetProfile);
        case 'clear':
          return await handleClear(targetProfile);
        default:
          return {
            success: false,
            content: `Unknown action: ${cleanAction}\n\nUse '/credentials' without arguments to see usage.`
          };
      }
    } catch (error) {
      return {
        success: false,
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
};

async function handleProfile(subaction?: string, args: string[] = []): Promise<CommandResult> {
  switch (subaction) {
    case 'list':
      return await handleProfileList();
    case 'current':
      return await handleProfileCurrent();
    case 'create':
      return await handleProfileCreate(args[0]);
    case 'switch':
      return await handleProfileSwitch(args[0]);
    case 'delete':
      return await handleProfileDelete(args[0]);
    case 'clear':
      return await handleProfileClear(args[0]);
    default:
      return {
        success: false,
        content: `Usage: /credentials profile <action>

Actions:
  list         - List all profiles
  current      - Show current and active profile info
  create <name> - Create a new profile
  switch <name> - Switch to a profile (persistent)
  delete <name> - Delete a profile
  clear [name] - Clear credentials in profile (defaults to active)`
      };
  }
}

async function handleProfileList(): Promise<CommandResult> {
  const { profiles, current, active } = await credentialManager.listProfiles();

  let content = '📋 Available Profiles\n\n';

  for (const profile of profiles.sort()) {
    let indicator = '  ';
    let suffix = '';

    if (profile === active && profile === current) {
      indicator = '👉'; // Both active and current
      suffix = ' (active & current)';
    } else if (profile === active) {
      indicator = '🔸'; // Active (via CLI override)
      suffix = ' (active)';
    } else if (profile === current) {
      indicator = '📌'; // Current (stored)
      suffix = ' (current)';
    }

    content += `${indicator} ${profile}${suffix}\n`;
  }

  content += `\n💡 **Profile Priority:**\n`;
  content += `• Active: ${active} ${active !== current ? '(CLI override)' : ''}\n`;
  content += `• Current: ${current} (stored)\n\n`;
  content += `Use '/credentials profile switch <name>' to change current profile\n`;
  content += `Use 'llpm --profile <name>' to override active profile temporarily`;

  return { success: true, content };
}

async function handleProfileCurrent(): Promise<CommandResult> {
  const { current, active } = await credentialManager.listProfiles();

  let content = '📍 Profile Information\n\n';
  content += `**Active Profile:** ${active}\n`;
  content += `**Current Profile:** ${current}\n\n`;

  if (active !== current) {
    content += `ℹ️  Active profile is overridden by CLI flag (--profile ${active})\n`;
    content += `💾 Stored current profile is: ${current}\n\n`;
  } else {
    content += `✅ Active and current profiles match\n\n`;
  }

  content += `**Credential Status for '${active}':**\n`;
  const status = await credentialManager.getCredentialStatus();

  for (const [provider, credentials] of Object.entries(status)) {
    const providerName = formatProviderName(provider);
    content += `• ${providerName}: `;
    const configuredKeys = Object.entries(credentials)
      .filter(([, isSet]) => isSet)
      .map(([key]) => key);
    if (configuredKeys.length > 0) {
      content += `✅ ${configuredKeys.join(', ')}`;
    } else {
      content += `❌ not configured`;
    }
    content += '\n';
  }

  return { success: true, content };
}

async function handleProfileCreate(profileName?: string): Promise<CommandResult> {
  if (!profileName) {
    return {
      success: false,
      content: 'Usage: /credentials profile create <name>'
    };
  }

  await credentialManager.createProfile(profileName);

  return {
    success: true,
    content: `✅ Created profile '${profileName}'\n\n💡 Use '/credentials profile switch ${profileName}' to make it active`
  };
}

async function handleProfileSwitch(profileName?: string): Promise<CommandResult> {
  if (!profileName) {
    return {
      success: false,
      content: 'Usage: /credentials profile switch <name>'
    };
  }

  await credentialManager.switchProfile(profileName);

  return {
    success: true,
    content: `✅ Switched to profile '${profileName}'\n\n🔄 This change is persistent until you switch again`
  };
}

async function handleProfileDelete(profileName?: string): Promise<CommandResult> {
  if (!profileName) {
    return {
      success: false,
      content: 'Usage: /credentials profile delete <name>'
    };
  }

  await credentialManager.deleteProfile(profileName);

  return {
    success: true,
    content: `🗑️  Deleted profile '${profileName}'`
  };
}

async function handleProfileClear(profileName?: string): Promise<CommandResult> {
  const targetProfile = profileName || credentialManager.getCurrentProfileName();

  await credentialManager.clearProfile(targetProfile);

  return {
    success: true,
    content: `🧹 Cleared all credentials from profile '${targetProfile}'`
  };
}

async function handleStatus(): Promise<CommandResult> {
  const status = await credentialManager.getCredentialStatus();
  const currentProfile = credentialManager.getCurrentProfileName();

  let content = `🔐 Credential Status (Profile: ${currentProfile})\n\n`;

  for (const [provider, credentials] of Object.entries(status)) {
    const providerName = formatProviderName(provider);
    content += `**${providerName}**\n`;

    for (const [key, isSet] of Object.entries(credentials)) {
      const indicator = isSet ? '✅' : '❌';
      content += `  ${indicator} ${key}: ${isSet ? 'configured' : 'not configured'}\n`;
    }
    content += '\n';
  }

  content += '💡 **Priority**: Environment variables → active profile → default profile\n';
  content += 'Use `/credentials set <provider> <key> <value>` to configure credentials.';

  return { success: true, content };
}

async function handleSet(
  provider?: string,
  key?: string,
  value?: string,
  profileName?: string
): Promise<CommandResult> {
  if (!provider || !key || !value) {
    return {
      success: false,
      content: 'Usage: /credentials set <provider> <key> <value> [--profile <name>]'
    };
  }

  const validProviders = ['openai', 'anthropic', 'groq', 'googleVertex', 'github', 'arcade'];
  if (!validProviders.includes(provider)) {
    return {
      success: false,
      content: `Invalid provider: ${provider}\nValid providers: ${validProviders.join(', ')}`
    };
  }

  const targetProfile = profileName || credentialManager.getCurrentProfileName();

  await credentialManager.setCredential(provider as any, key, value, profileName);

  return {
    success: true,
    content: `✅ Set ${formatProviderName(provider)}.${key} in profile '${targetProfile}'\n\n💡 Stored securely in ~/.llpm/credentials.json`
  };
}

async function handleGet(
  provider?: string,
  key?: string,
  _profileName?: string
): Promise<CommandResult> {
  if (!provider || !key) {
    return {
      success: false,
      content: 'Usage: /credentials get <provider> <key> [--profile <name>]'
    };
  }

  // For get operations, we use the profile-aware credential manager
  const credential = await credentialManager.getCredential(provider as any, key);
  const activeProfile = credentialManager.getCurrentProfileName();

  if (!credential) {
    return {
      success: true,
      content: `${formatProviderName(provider)}.${key}: not configured (checked profile '${activeProfile}')`
    };
  }

  // Mask the credential for security
  const masked =
    credential.length <= 8
      ? '*'.repeat(credential.length)
      : credential.substring(0, 4) +
        '*'.repeat(credential.length - 8) +
        credential.substring(credential.length - 4);

  return {
    success: true,
    content: `${formatProviderName(provider)}.${key}: ${masked} (from profile '${activeProfile}')`
  };
}

async function handleRemove(
  provider?: string,
  key?: string,
  profileName?: string
): Promise<CommandResult> {
  if (!provider || !key) {
    return {
      success: false,
      content: 'Usage: /credentials remove <provider> <key> [--profile <name>]'
    };
  }

  const targetProfile = profileName || credentialManager.getCurrentProfileName();

  await credentialManager.removeCredential(provider as any, key, profileName);

  return {
    success: true,
    content: `✅ Removed ${formatProviderName(provider)}.${key} from profile '${targetProfile}'`
  };
}

async function handleClear(profileName?: string): Promise<CommandResult> {
  const targetProfile = profileName || credentialManager.getCurrentProfileName();

  await credentialManager.clearProfile(targetProfile);

  return {
    success: true,
    content: `🗑️  Cleared all credentials from profile '${targetProfile}'\n\n⚠️  Environment variables are not affected.`
  };
}

function formatProviderName(provider: string): string {
  const nameMap: Record<string, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    groq: 'Groq',
    googleVertex: 'Google Vertex',
    github: 'GitHub',
    arcade: 'Arcade'
  };

  return nameMap[provider] || provider;
}
