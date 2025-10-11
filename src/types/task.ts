/**
 * Task orchestration types for conversational task execution
 * Supports slot-filling, iterative drafting, and explicit confirmation flows
 */

export type TaskStatus =
  | 'draft'           // Initial state, gathering inputs
  | 'ready'           // All required slots filled, ready for review
  | 'confirmed'       // User confirmed, ready to execute
  | 'executing'       // Write operation in progress
  | 'completed'       // Successfully completed
  | 'cancelled'       // User cancelled
  | 'failed';         // Execution failed

export type SlotType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'text';           // Multi-line text

export interface TaskSlot {
  name: string;
  type: SlotType;
  required: boolean;
  description: string;
  prompt?: string;    // Question to ask user
  defaultValue?: unknown;
  enumValues?: string[]; // For enum type
  validation?: (value: unknown) => boolean | string;
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  category: 'github' | 'project' | 'agent' | 'config';
  slots: TaskSlot[];
  generateDraft: (slots: Record<string, unknown>) => string;
  execute: (slots: Record<string, unknown>, draft: string) => Promise<TaskResult>;
}

export interface TaskInstance {
  id: string;
  templateId: string;
  status: TaskStatus;
  slots: Record<string, unknown>;
  draft: string;
  draftHistory: string[];
  noteId?: number;
  artifactId?: string; // e.g., issue number, PR number
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
}

export interface TaskResult {
  success: boolean;
  artifactId?: string;
  artifactUrl?: string;
  message: string;
}

export interface TaskSlotUpdate {
  slotName: string;
  value: unknown;
}

export interface TaskEditRequest {
  instruction: string; // Free-text edit instruction
}
