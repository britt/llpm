import { debug } from './logger';
import { credentialManager } from './credentialManager';

export async function validateEnvironment() {
  debug('Validating credentials (environment variables and profiles)');

  const hasOpenAI = !!(await credentialManager.getOpenAIAPIKey());
  const hasAnthropic = !!(await credentialManager.getAnthropicAPIKey());
  const hasGroq = !!(await credentialManager.getGroqAPIKey());
  const hasVertex = !!(await credentialManager.getGoogleVertexProjectId());

  if (!hasOpenAI && !hasAnthropic && !hasGroq && !hasVertex) {
    const currentProfile = credentialManager.getCurrentProfileName();
    debug('No AI provider credentials found');
    console.error('❌ Error: At least one AI provider credential is required');
    console.error('');
    console.error(`Currently active profile: ${currentProfile}`);
    console.error('');
    console.error('🔧 Setup options:');
    console.error('');
    console.error('1. Environment Variables:');
    console.error('  OPENAI_API_KEY=your-key-here');
    console.error('  ANTHROPIC_API_KEY=your-key-here');
    console.error('  GROQ_API_KEY=your-key-here');
    console.error('  GOOGLE_VERTEX_PROJECT_ID=your-project-id');
    console.error('');
    console.error('2. Stored Credentials (persistent):');
    console.error('  /credentials set openai apiKey your-key-here');
    console.error('  /credentials set anthropic apiKey your-key-here');
    console.error('  /credentials set groq apiKey your-key-here');
    console.error('  /credentials set googleVertex projectId your-project-id');
    console.error('');
    console.error('3. Different Profile:');
    console.error('  llpm --profile work');
    console.error('  /credentials profile create work');
    console.error('');
    console.error('Get API keys from:');
    console.error('• OpenAI: https://platform.openai.com/api-keys');
    console.error('• Anthropic: https://console.anthropic.com/');
    console.error('• Groq: https://console.groq.com/keys');
    process.exit(1);
  }

  debug('Environment validation passed');
  debug('Available providers:', { hasOpenAI, hasAnthropic, hasGroq, hasVertex });
}
