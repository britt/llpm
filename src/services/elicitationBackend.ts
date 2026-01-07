import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { getConfigDir } from '../utils/config';

/**
 * Backend service for managing elicitation session state.
 * Stores sessions as JSON files in the project's elicitation directory.
 */
export class ElicitationBackend {
  private projectId: string;
  private elicitationDir: string;

  constructor(projectId: string) {
    this.projectId = projectId;
    const configDir = getConfigDir();
    this.elicitationDir = path.join(configDir, 'projects', projectId, 'elicitation');
  }

  /**
   * Initialize the elicitation directory.
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.elicitationDir, { recursive: true });
  }

  /**
   * Get the elicitation directory path.
   */
  getElicitationDir(): string {
    return this.elicitationDir;
  }
}
