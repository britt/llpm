import { execSync } from 'node:child_process';
import { askYesNo, askSecret, type ReadlineInterface } from '../prompts';
import { credentialManager } from '../../utils/credentialManager';

export interface GithubTokenResult {
  success: boolean;
  skipped: boolean;
}

/**
 * Try to detect GitHub token from `gh auth token`
 */
export function detectGhCliToken(): string | null {
  try {
    const rawToken = execSync('gh auth token', {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const token = rawToken.trim();
    return token || null;
  } catch {
    return null;
  }
}

export async function setupGithubToken(
  rl: ReadlineInterface,
  force: boolean,
  tokenDetector: () => string | null = detectGhCliToken
): Promise<GithubTokenResult> {
  console.log('\n  Step 3: GitHub Token (Strongly Recommended)\n');
  console.log('  A GitHub token enables issue management, PR creation, and repo browsing.');
  console.log('  Most LLPM features depend on GitHub integration.\n');

  // Check existing config
  if (!force) {
    const existingToken = await credentialManager.getGitHubToken();
    if (existingToken) {
      console.log('  GitHub token is already configured.');
      const reconfigure = await askYesNo(rl, '  Reconfigure?', false);
      if (!reconfigure) {
        return { success: true, skipped: true };
      }
    }
  }

  // Try to detect from gh CLI
  const detectedToken = tokenDetector();

  if (detectedToken) {
    console.log('  Detected GitHub token from `gh auth token`.');
    const useDetected = await askYesNo(rl, '  Use this token?', true);

    if (useDetected) {
      await credentialManager.setCredential('github', 'token', detectedToken);
      console.log('  GitHub token configured from gh CLI.');
      return { success: true, skipped: false };
    }
  }

  // Manual entry
  const token = await askSecret(rl, '  Enter GitHub token (or press Enter to skip): ');

  if (!token) {
    console.log('\n  Skipped. GitHub features will be limited.');
    console.log('  You can configure later with: /credentials set github token <token>');
    return { success: true, skipped: true };
  }

  await credentialManager.setCredential('github', 'token', token);
  console.log('  GitHub token configured.');
  return { success: true, skipped: false };
}
