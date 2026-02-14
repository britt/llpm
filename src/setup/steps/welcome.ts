/**
 * Welcome step - displays LLPM banner and setup description
 */
export function showWelcome(): void {
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║           LLPM Setup Wizard          ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
  console.log('  Welcome to LLPM — your AI-powered project manager.');
  console.log('');
  console.log('  This setup will walk you through:');
  console.log('    1. AI provider API key configuration');
  console.log('    2. Default model selection');
  console.log('    3. GitHub token (recommended)');
  console.log('    4. Arcade API key (recommended)');
  console.log('    5. First project creation');
  console.log('');
}
