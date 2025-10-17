/**
 * Local embeddings provider using bge-base-en-v1.5 via CLI subprocess
 */

import { debug } from '../../utils/logger';
import type { EmbeddingsProvider, EmbeddingResult } from './types';
import { join } from 'path';
import { spawn } from 'child_process';

export interface LocalProviderConfig {
  pythonPath: string;
  scriptPath: string;
  timeout: number;
  batchSize: number;
}

// Check for venv Python first, then fall back to system Python
function getDefaultPythonPath(): string {
  if (process.env.EMBEDDINGS_PYTHON) {
    return process.env.EMBEDDINGS_PYTHON;
  }

  // Try venv Python first
  const venvPython = join(process.cwd(), 'scripts', 'embeddings', 'venv', 'bin', 'python');
  try {
    const fs = require('fs');
    if (fs.existsSync(venvPython)) {
      return venvPython;
    }
  } catch (e) {
    // Fall through to system python
  }

  return 'python3';
}

const DEFAULT_CONFIG: LocalProviderConfig = {
  pythonPath: getDefaultPythonPath(),
  scriptPath: join(process.cwd(), 'scripts', 'embeddings', 'generate.py'),
  timeout: 60000, // 60 seconds (model loading takes time)
  batchSize: 32
};

interface EmbeddingResponse {
  embeddings?: number[][];
  model?: string;
  dimension?: number;
  error?: string;
}

export class LocalEmbeddingsProvider implements EmbeddingsProvider {
  private config: LocalProviderConfig;
  private dimensions: number = 768; // bge-base-en-v1.5 default

  constructor(config: Partial<LocalProviderConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    debug('Initialized LocalEmbeddingsProvider with config:', this.config);
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Check if Python is available
      const pythonCheck = spawn(this.config.pythonPath, ['--version']);

      return new Promise((resolve) => {
        pythonCheck.on('close', (code) => {
          resolve(code === 0);
        });
        pythonCheck.on('error', () => {
          resolve(false);
        });
      });
    } catch (error) {
      debug('Python not available:', error);
      return false;
    }
  }

  getName(): string {
    return 'local-bge-base-en-v1.5';
  }

  getDimensions(): number {
    return this.dimensions;
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult | null> {
    const results = await this.generateEmbeddings([text]);
    return results && results.length > 0 ? results[0] : null;
  }

  async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[] | null> {
    if (texts.length === 0) {
      return [];
    }

    try {
      debug(`Generating embeddings for ${texts.length} texts using Python CLI`);

      const input = JSON.stringify({
        input: texts,
        batch_size: this.config.batchSize
      });

      // Spawn Python process
      const python = spawn(this.config.pythonPath, [this.config.scriptPath], {
        env: { ...process.env, EMBEDDINGS_DEVICE: process.env.EMBEDDINGS_DEVICE || 'cpu' }
      });

      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Write input to stdin
      python.stdin.write(input);
      python.stdin.end();

      // Wait for process to complete with timeout
      const result = await Promise.race([
        new Promise<EmbeddingResponse>((resolve, reject) => {
          python.on('close', (code) => {
            if (code !== 0) {
              reject(new Error(`Python process exited with code ${code}: ${stderr}`));
            } else {
              try {
                const response: EmbeddingResponse = JSON.parse(stdout);
                if (response.error) {
                  reject(new Error(response.error));
                } else {
                  resolve(response);
                }
              } catch (e) {
                reject(new Error(`Failed to parse Python output: ${stdout}`));
              }
            }
          });

          python.on('error', (error) => {
            reject(error);
          });
        }),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Python process timeout')), this.config.timeout);
        })
      ]);

      // Update dimensions from response
      if (result.dimension && result.dimension !== this.dimensions) {
        debug(`Updating dimensions from ${this.dimensions} to ${result.dimension}`);
        this.dimensions = result.dimension;
      }

      // Convert to EmbeddingResult format
      const results: EmbeddingResult[] = result.embeddings!.map(emb => ({
        embedding: new Float32Array(emb),
        dimensions: result.dimension!,
        model: result.model!
      }));

      debug(`Successfully generated ${results.length} embeddings`);
      return results;

    } catch (error) {
      debug('Failed to generate embeddings:', error);
      return null;
    }
  }
}
