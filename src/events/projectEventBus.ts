import { EventEmitter } from 'events';

export interface ProjectSwitchedEvent {
  projectId: string;
  projectName: string;
}

class ProjectEventBus extends EventEmitter {}

let instance: ProjectEventBus | null = null;

export function getProjectEventBus(): ProjectEventBus {
  if (!instance) {
    instance = new ProjectEventBus();
  }
  return instance;
}

export function resetProjectEventBusForTesting(): void {
  if (instance) {
    instance.removeAllListeners();
  }
  instance = null;
}
