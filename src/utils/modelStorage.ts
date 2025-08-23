import { join } from 'path';
import { homedir } from 'os';
import type { ModelConfig } from '../types/models';
import { debug } from './logger';

const STORAGE_DIR = join(homedir(), '.llpm');
const MODEL_CONFIG_FILE = join(STORAGE_DIR, 'model-config.json');

interface StoredModelConfig {
  currentModel?: ModelConfig;
  lastUpdated: string;
}

export async function saveCurrentModel(model: ModelConfig): Promise<void> {
  try {
    debug('Saving current model to storage:', model.displayName);
    
    // Ensure storage directory exists using Bun's shell command
    await Bun.spawn(['mkdir', '-p', STORAGE_DIR]).exited;
    
    const config: StoredModelConfig = {
      currentModel: model,
      lastUpdated: new Date().toISOString()
    };
    
    await Bun.write(MODEL_CONFIG_FILE, JSON.stringify(config, null, 2));
    debug('Model configuration saved successfully');
  } catch (error) {
    debug('Error saving model configuration:', error);
    // Don't throw - we can continue without persistence
  }
}

export async function loadCurrentModel(): Promise<ModelConfig | null> {
  try {
    debug('Loading current model from storage');
    
    const file = Bun.file(MODEL_CONFIG_FILE);
    
    if (!(await file.exists())) {
      debug('Model config file does not exist');
      return null;
    }
    
    const content = await file.text();
    const config: StoredModelConfig = JSON.parse(content);
    
    if (!config.currentModel) {
      debug('No current model in config file');
      return null;
    }
    
    debug('Loaded model from storage:', config.currentModel.displayName);
    return config.currentModel;
  } catch (error) {
    debug('Error loading model configuration:', error);
    return null;
  }
}

export async function clearStoredModel(): Promise<void> {
  try {
    debug('Clearing stored model configuration');
    const file = Bun.file(MODEL_CONFIG_FILE);
    
    if (await file.exists()) {
      await Bun.write(MODEL_CONFIG_FILE, JSON.stringify({
        lastUpdated: new Date().toISOString()
      }, null, 2));
    }
    
    debug('Stored model configuration cleared');
  } catch (error) {
    debug('Error clearing model configuration:', error);
  }
}