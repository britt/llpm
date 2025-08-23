import type { ModelConfig } from '../types/models';
import { debug } from './logger';
import { loadProjectConfig, saveProjectConfig } from './projectConfig';

export async function saveCurrentModel(model: ModelConfig): Promise<void> {
  try {
    debug('Saving current model to unified config:', model.displayName);
    
    const config = await loadProjectConfig();
    config.model = {
      currentModel: model,
      lastUpdated: new Date().toISOString()
    };
    
    await saveProjectConfig(config);
    debug('Model configuration saved successfully to unified config');
  } catch (error) {
    debug('Error saving model configuration:', error);
    // Don't throw - we can continue without persistence
  }
}

export async function loadCurrentModel(): Promise<ModelConfig | null> {
  try {
    debug('Loading current model from unified config');
    
    const config = await loadProjectConfig();
    
    if (!config.model?.currentModel) {
      debug('No current model in unified config');
      return null;
    }
    
    debug('Loaded model from unified config:', config.model.currentModel.displayName);
    return config.model.currentModel;
  } catch (error) {
    debug('Error loading model configuration:', error);
    return null;
  }
}

export async function clearStoredModel(): Promise<void> {
  try {
    debug('Clearing stored model configuration from unified config');
    
    const config = await loadProjectConfig();
    config.model = {
      lastUpdated: new Date().toISOString()
    };
    
    await saveProjectConfig(config);
    debug('Stored model configuration cleared from unified config');
  } catch (error) {
    debug('Error clearing model configuration:', error);
  }
}