import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { debug } from './logger';

export interface CredentialConfig {
  // LLM Provider Credentials
  openai?: {
    apiKey?: string;
  };
  anthropic?: {
    apiKey?: string;
  };
  groq?: {
    apiKey?: string;
  };
  googleVertex?: {
    projectId?: string;
    region?: string;
  };
  
  // GitHub Integration
  github?: {
    token?: string;
  };
  
  // Web Search
  arcade?: {
    apiKey?: string;
  };
  
}

export interface ProfileConfig {
  profiles: Record<string, CredentialConfig>;
  currentProfile: string;
  metadata: {
    version: string;
    lastUpdated: string;
  };
}

export class CredentialManager {
  private static instance: CredentialManager;
  private configPath: string;
  private profileConfig: ProfileConfig | null = null;
  private overrideProfile: string | null = null;
  private readonly DEFAULT_PROFILE = 'default';

  private constructor() {
    this.configPath = join(homedir(), '.llpm', 'credentials.json');
  }

  public static getInstance(): CredentialManager {
    if (!CredentialManager.instance) {
      CredentialManager.instance = new CredentialManager();
    }
    return CredentialManager.instance;
  }

  /**
   * Set the profile to use (overrides stored current profile)
   * This is called from command line flag processing
   */
  public setProfileOverride(profileName: string): void {
    this.overrideProfile = profileName;
    debug(`Profile override set to: ${profileName}`);
  }

  /**
   * Get the currently active profile name
   */
  public getCurrentProfileName(): string {
    // Command line override takes precedence
    if (this.overrideProfile) {
      return this.overrideProfile;
    }

    // Then check stored current profile
    if (this.profileConfig?.currentProfile) {
      return this.profileConfig.currentProfile;
    }

    // Default fallback
    return this.DEFAULT_PROFILE;
  }

  /**
   * Get credential with environment variable fallback
   * Priority: Environment Variable > Active Profile > Default Profile
   */
  public async getCredential(
    provider: keyof CredentialConfig,
    key: string,
    envVar?: string
  ): Promise<string | undefined> {
    // First check environment variable
    if (envVar && process.env[envVar]) {
      debug(`Using environment variable for ${provider}.${key}`);
      return process.env[envVar];
    }

    // Load profile config if not already loaded
    await this.loadProfileConfig();

    const currentProfile = this.getCurrentProfileName();
    
    // Check current/active profile
    const activeProfileConfig = this.profileConfig?.profiles[currentProfile];
    const activeCredential = (activeProfileConfig?.[provider] as any)?.[key];
    
    if (activeCredential) {
      debug(`Using credential from profile '${currentProfile}' for ${provider}.${key}`);
      return activeCredential;
    }

    // If not in current profile and current profile isn't default, check default profile
    if (currentProfile !== this.DEFAULT_PROFILE) {
      const defaultProfileConfig = this.profileConfig?.profiles[this.DEFAULT_PROFILE];
      const defaultCredential = (defaultProfileConfig?.[provider] as any)?.[key];
      
      if (defaultCredential) {
        debug(`Using credential from default profile for ${provider}.${key}`);
        return defaultCredential;
      }
    }

    debug(`No credential found for ${provider}.${key}`);
    return undefined;
  }

  /**
   * Get OpenAI API key (env: OPENAI_API_KEY)
   */
  public async getOpenAIAPIKey(): Promise<string | undefined> {
    return this.getCredential('openai', 'apiKey', 'OPENAI_API_KEY');
  }

  /**
   * Get Anthropic API key (env: ANTHROPIC_API_KEY)
   */
  public async getAnthropicAPIKey(): Promise<string | undefined> {
    return this.getCredential('anthropic', 'apiKey', 'ANTHROPIC_API_KEY');
  }

  /**
   * Get Groq API key (env: GROQ_API_KEY)
   */
  public async getGroqAPIKey(): Promise<string | undefined> {
    return this.getCredential('groq', 'apiKey', 'GROQ_API_KEY');
  }

  /**
   * Get Google Vertex project ID (env: GOOGLE_VERTEX_PROJECT_ID)
   */
  public async getGoogleVertexProjectId(): Promise<string | undefined> {
    return this.getCredential('googleVertex', 'projectId', 'GOOGLE_VERTEX_PROJECT_ID');
  }

  /**
   * Get Google Vertex region (env: GOOGLE_VERTEX_REGION, default: us-central1)
   */
  public async getGoogleVertexRegion(): Promise<string> {
    const region = await this.getCredential('googleVertex', 'region', 'GOOGLE_VERTEX_REGION');
    return region || 'us-central1';
  }

  /**
   * Get GitHub token (env: GITHUB_TOKEN or GH_TOKEN)
   */
  public async getGitHubToken(): Promise<string | undefined> {
    // Check both environment variables
    if (process.env.GITHUB_TOKEN) {
      debug('Using GITHUB_TOKEN environment variable');
      return process.env.GITHUB_TOKEN;
    }
    if (process.env.GH_TOKEN) {
      debug('Using GH_TOKEN environment variable');
      return process.env.GH_TOKEN;
    }

    // Fallback to profile config
    await this.loadProfileConfig();
    
    const currentProfile = this.getCurrentProfileName();
    const activeProfileConfig = this.profileConfig?.profiles[currentProfile];
    const token = activeProfileConfig?.github?.token;
    
    if (token) {
      debug(`Using GitHub token from profile '${currentProfile}'`);
      return token;
    }

    // Check default profile if not current
    if (currentProfile !== this.DEFAULT_PROFILE) {
      const defaultToken = this.profileConfig?.profiles[this.DEFAULT_PROFILE]?.github?.token;
      if (defaultToken) {
        debug('Using GitHub token from default profile');
        return defaultToken;
      }
    }

    debug('No GitHub token found');
    return undefined;
  }

  /**
   * Get Arcade API key (env: ARCADE_API_KEY)
   */
  public async getArcadeAPIKey(): Promise<string | undefined> {
    return this.getCredential('arcade', 'apiKey', 'ARCADE_API_KEY');
  }


  /**
   * Set a credential in the specified profile (or current profile)
   */
  public async setCredential(
    provider: keyof CredentialConfig,
    key: string,
    value: string,
    profileName?: string
  ): Promise<void> {
    await this.loadProfileConfig();

    const targetProfile = profileName || this.getCurrentProfileName();

    if (!this.profileConfig) {
      this.profileConfig = this.createDefaultProfileConfig();
    }

    // Ensure profile exists
    if (!this.profileConfig.profiles[targetProfile]) {
      this.profileConfig.profiles[targetProfile] = {};
    }

    // Ensure provider exists in profile
    if (!this.profileConfig.profiles[targetProfile][provider]) {
      (this.profileConfig.profiles[targetProfile] as any)[provider] = {};
    }

    // Set the credential
    ((this.profileConfig.profiles[targetProfile] as any)[provider] as any)[key] = value;

    await this.saveProfileConfig();
    debug(`Set credential for ${provider}.${key} in profile '${targetProfile}'`);
  }

  /**
   * Remove a credential from the specified profile (or current profile)
   */
  public async removeCredential(
    provider: keyof CredentialConfig,
    key: string,
    profileName?: string
  ): Promise<void> {
    await this.loadProfileConfig();

    if (!this.profileConfig) {
      return; // Nothing to remove
    }

    const targetProfile = profileName || this.getCurrentProfileName();
    const profile = this.profileConfig.profiles[targetProfile];

    if (profile?.[provider]) {
      delete ((profile as any)[provider] as any)[key];

      // If provider config is now empty, remove it entirely
      if (Object.keys(profile[provider] as any).length === 0) {
        delete profile[provider];
      }

      await this.saveProfileConfig();
      debug(`Removed credential for ${provider}.${key} from profile '${targetProfile}'`);
    }
  }

  /**
   * Create a new profile
   */
  public async createProfile(profileName: string): Promise<void> {
    if (profileName === this.DEFAULT_PROFILE) {
      throw new Error('Cannot explicitly create default profile - it exists automatically');
    }

    await this.loadProfileConfig();

    if (!this.profileConfig) {
      this.profileConfig = this.createDefaultProfileConfig();
    }

    if (this.profileConfig.profiles[profileName]) {
      throw new Error(`Profile '${profileName}' already exists`);
    }

    this.profileConfig.profiles[profileName] = {};
    await this.saveProfileConfig();
    debug(`Created profile '${profileName}'`);
  }

  /**
   * Delete a profile
   */
  public async deleteProfile(profileName: string): Promise<void> {
    if (profileName === this.DEFAULT_PROFILE) {
      throw new Error('Cannot delete default profile');
    }

    await this.loadProfileConfig();

    if (!this.profileConfig?.profiles[profileName]) {
      throw new Error(`Profile '${profileName}' does not exist`);
    }

    delete this.profileConfig.profiles[profileName];

    // If deleting the current profile, switch to default
    if (this.profileConfig.currentProfile === profileName) {
      this.profileConfig.currentProfile = this.DEFAULT_PROFILE;
    }

    await this.saveProfileConfig();
    debug(`Deleted profile '${profileName}'`);
  }

  /**
   * Switch to a different profile (persisted)
   */
  public async switchProfile(profileName: string): Promise<void> {
    await this.loadProfileConfig();

    if (!this.profileConfig) {
      this.profileConfig = this.createDefaultProfileConfig();
    }

    // Ensure profile exists (create if it's default)
    if (!this.profileConfig.profiles[profileName]) {
      if (profileName === this.DEFAULT_PROFILE) {
        this.profileConfig.profiles[profileName] = {};
      } else {
        throw new Error(`Profile '${profileName}' does not exist. Create it first with: /credentials profile create ${profileName}`);
      }
    }

    this.profileConfig.currentProfile = profileName;
    await this.saveProfileConfig();
    debug(`Switched to profile '${profileName}'`);
  }

  /**
   * List all available profiles
   */
  public async listProfiles(): Promise<{ profiles: string[]; current: string; active: string }> {
    await this.loadProfileConfig();

    const profiles = this.profileConfig?.profiles 
      ? Object.keys(this.profileConfig.profiles)
      : [this.DEFAULT_PROFILE];

    // Ensure default profile is always included
    if (!profiles.includes(this.DEFAULT_PROFILE)) {
      profiles.unshift(this.DEFAULT_PROFILE);
    }

    const current = this.profileConfig?.currentProfile || this.DEFAULT_PROFILE;
    const active = this.getCurrentProfileName();

    return { profiles, current, active };
  }

  /**
   * Get all configured credentials for the active profile (for display purposes - values are masked)
   */
  public async getCredentialStatus(): Promise<Record<string, Record<string, boolean>>> {
    const status: Record<string, Record<string, boolean>> = {};

    // Check all credentials using the current active profile
    const openaiKey = await this.getOpenAIAPIKey();
    const anthropicKey = await this.getAnthropicAPIKey();
    const groqKey = await this.getGroqAPIKey();
    const vertexProjectId = await this.getGoogleVertexProjectId();
    const githubToken = await this.getGitHubToken();
    const arcadeKey = await this.getArcadeAPIKey();

    status.openai = { apiKey: !!openaiKey };
    status.anthropic = { apiKey: !!anthropicKey };
    status.groq = { apiKey: !!groqKey };
    status.googleVertex = { 
      projectId: !!vertexProjectId,
      region: true // Region always has default value
    };
    status.github = { token: !!githubToken };
    status.arcade = { apiKey: !!arcadeKey };

    return status;
  }

  /**
   * Clear all credentials from the specified profile (or current profile)
   */
  public async clearProfile(profileName?: string): Promise<void> {
    await this.loadProfileConfig();

    const targetProfile = profileName || this.getCurrentProfileName();

    if (!this.profileConfig) {
      return; // Nothing to clear
    }

    this.profileConfig.profiles[targetProfile] = {};
    await this.saveProfileConfig();
    debug(`Cleared all credentials from profile '${targetProfile}'`);
  }

  /**
   * Clear all profiles and reset to default
   */
  public async clearAllProfiles(): Promise<void> {
    this.profileConfig = this.createDefaultProfileConfig();
    await this.saveProfileConfig();
    debug('Cleared all profiles and reset to default');
  }

  /**
   * Load profile configuration from config file
   */
  private async loadProfileConfig(): Promise<void> {
    if (this.profileConfig !== null) {
      return; // Already loaded
    }

    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      const parsed = JSON.parse(data);

      // Handle migration from old format (single credential config)
      if (parsed.profiles) {
        // New format
        this.profileConfig = parsed;
      } else {
        // Old format - migrate to profile-based format
        debug('Migrating old credential format to profile-based format');
        this.profileConfig = {
          profiles: {
            [this.DEFAULT_PROFILE]: parsed
          },
          currentProfile: this.DEFAULT_PROFILE,
          metadata: {
            version: '2.0.0',
            lastUpdated: new Date().toISOString()
          }
        };
        // Save migrated format
        await this.saveProfileConfig();
      }

      debug('Loaded profile configuration');
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        debug('Profile config file does not exist, creating default');
        this.profileConfig = this.createDefaultProfileConfig();
      } else {
        debug('Error loading profile config:', error);
        this.profileConfig = this.createDefaultProfileConfig();
      }
    }
  }

  /**
   * Save profile configuration to config file
   */
  private async saveProfileConfig(): Promise<void> {
    if (!this.profileConfig) {
      return;
    }

    try {
      // Update metadata
      this.profileConfig.metadata.lastUpdated = new Date().toISOString();

      // Ensure directory exists
      const dir = join(homedir(), '.llpm');
      await fs.mkdir(dir, { recursive: true });

      // Save with secure permissions (readable only by owner)
      await fs.writeFile(
        this.configPath,
        JSON.stringify(this.profileConfig, null, 2),
        { mode: 0o600 }
      );
      
      debug('Saved profile configuration');
    } catch (error) {
      debug('Error saving profile config:', error);
      throw new Error(`Failed to save profile configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create default profile configuration
   */
  private createDefaultProfileConfig(): ProfileConfig {
    return {
      profiles: {
        [this.DEFAULT_PROFILE]: {}
      },
      currentProfile: this.DEFAULT_PROFILE,
      metadata: {
        version: '2.0.0',
        lastUpdated: new Date().toISOString()
      }
    };
  }
}

// Export singleton instance
export const credentialManager = CredentialManager.getInstance();