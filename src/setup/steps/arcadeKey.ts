import { askYesNo, askSecret, type ReadlineInterface } from '../prompts';
import { credentialManager } from '../../utils/credentialManager';

export interface ArcadeKeyResult {
  success: boolean;
  skipped: boolean;
}

export async function setupArcadeKey(
  rl: ReadlineInterface,
  force: boolean
): Promise<ArcadeKeyResult> {
  console.log('\n  Step 4: Arcade API Key (Strongly Recommended)\n');
  console.log('  Arcade enables web search tools for AI-powered research.\n');

  // Check existing config
  if (!force) {
    const existingKey = await credentialManager.getArcadeAPIKey();
    if (existingKey) {
      console.log('  Arcade API key is already configured.');
      const reconfigure = await askYesNo(rl, '  Reconfigure?', false);
      if (!reconfigure) {
        return { success: true, skipped: true };
      }
    }
  }

  const key = await askSecret(rl, '  Enter Arcade API key (or press Enter to skip): ');

  if (!key) {
    console.log('\n  Skipped. Web search features will be unavailable.');
    console.log('  You can configure later with: /credentials set arcade apiKey <key>');
    return { success: true, skipped: true };
  }

  await credentialManager.setCredential('arcade', 'apiKey', key);
  console.log('  Arcade API key configured.');
  return { success: true, skipped: false };
}
