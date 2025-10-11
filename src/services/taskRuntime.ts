import type { TaskInstance, TaskSlotUpdate, TaskEditRequest, TaskResult, TaskStatus } from '../types/task';
import type { TaskTemplate } from '../types/task';
import { getTaskTemplate } from './taskTemplates';
import { getCurrentProjectDatabase } from '../utils/projectDatabase';
import { generateText } from 'ai';
import { modelRegistry } from './modelRegistry';
import { v4 as uuidv4 } from 'uuid';

/**
 * Task Runtime Service
 * Manages task instances, slot-filling, draft generation, and execution
 */
export class TaskRuntime {
  private tasks: Map<string, TaskInstance> = new Map();

  /**
   * Create a new task instance from a template
   */
  async instantiate(templateId: string, initialSlots?: Record<string, unknown>): Promise<TaskInstance> {
    const template = getTaskTemplate(templateId);
    if (!template) {
      throw new Error(`Task template not found: ${templateId}`);
    }

    const task: TaskInstance = {
      id: uuidv4(),
      templateId,
      status: 'draft',
      slots: initialSlots || {},
      draft: '',
      draftHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Validate initial slots if provided
    if (initialSlots) {
      const validation = this.validateSlots(template, initialSlots);
      if (!validation.valid) {
        throw new Error(`Invalid initial slots: ${validation.errors.join(', ')}`);
      }
    }

    // Generate initial draft if enough slots are filled
    if (this.hasRequiredSlots(template, task.slots)) {
      task.draft = template.generateDraft(task.slots);
      task.draftHistory.push(task.draft);
      task.status = 'ready';
    }

    this.tasks.set(task.id, task);
    return task;
  }

  /**
   * Fill a slot with a value
   */
  async fillSlot(taskId: string, update: TaskSlotUpdate): Promise<TaskInstance> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const template = getTaskTemplate(task.templateId);
    if (!template) {
      throw new Error(`Template not found: ${task.templateId}`);
    }

    const slot = template.slots.find(s => s.name === update.slotName);
    if (!slot) {
      throw new Error(`Slot not found: ${update.slotName}`);
    }

    // Validate the value
    if (slot.validation) {
      const result = slot.validation(update.value);
      if (result !== true) {
        throw new Error(`Validation failed: ${result}`);
      }
    }

    // Update the slot
    task.slots[update.slotName] = update.value;
    task.updatedAt = new Date().toISOString();

    // Regenerate draft if all required slots are filled
    if (this.hasRequiredSlots(template, task.slots)) {
      task.draft = template.generateDraft(task.slots);
      task.draftHistory.push(task.draft);
      task.status = 'ready';
    }

    this.tasks.set(taskId, task);
    return task;
  }

  /**
   * Get the next missing required slot
   */
  getNextMissingSlot(taskId: string): { name: string; prompt: string } | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    const template = getTaskTemplate(task.templateId);
    if (!template) return null;

    const missingSlot = template.slots.find(
      slot => slot.required && !(slot.name in task.slots)
    );

    if (!missingSlot) return null;

    return {
      name: missingSlot.name,
      prompt: missingSlot.prompt || `Please provide a value for ${missingSlot.name}`
    };
  }

  /**
   * Get current draft preview
   */
  getPreview(taskId: string): string | null {
    const task = this.tasks.get(taskId);
    return task?.draft || null;
  }

  /**
   * Apply free-text edits to the draft using AI
   */
  async edit(taskId: string, editRequest: TaskEditRequest): Promise<TaskInstance> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (!task.draft) {
      throw new Error('No draft available to edit');
    }

    // Use AI to apply the edit
    try {
      const config = modelRegistry.getCurrentModelConfig();
      const model = modelRegistry.createModelInstance(config);

      const { text: editedDraft } = await generateText({
        model,
        prompt: `You are editing a draft document. Apply the following edit instruction to the draft below.

Edit Instruction: ${editRequest.instruction}

Current Draft:
${task.draft}

Return ONLY the edited draft with the changes applied. Do not add any explanation or commentary.`
      });

      task.draft = editedDraft.trim();
      task.draftHistory.push(task.draft);
      task.updatedAt = new Date().toISOString();

      this.tasks.set(taskId, task);
      return task;
    } catch (error) {
      throw new Error(`Failed to apply edit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Confirm and execute the task
   */
  async confirm(taskId: string): Promise<TaskResult> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (task.status !== 'ready') {
      throw new Error(`Task is not ready for execution. Status: ${task.status}`);
    }

    const template = getTaskTemplate(task.templateId);
    if (!template) {
      throw new Error(`Template not found: ${task.templateId}`);
    }

    // Save draft as a note before execution
    try {
      const db = await getCurrentProjectDatabase();
      if (db) {
        const note = await db.addNote(
          `Task Draft: ${template.name}`,
          task.draft,
          'task-draft'
        );
        task.noteId = note.id;
        db.close();
      }
    } catch (error) {
      // Non-fatal, continue with execution
      console.error('Failed to save draft as note:', error);
    }

    // Update status to executing
    task.status = 'executing';
    task.updatedAt = new Date().toISOString();
    this.tasks.set(taskId, task);

    // Execute the task
    try {
      const result = await template.execute(task.slots, task.draft);

      if (result.success) {
        task.status = 'completed';
        task.artifactId = result.artifactId;
      } else {
        task.status = 'failed';
        task.errorMessage = result.message;
      }

      task.updatedAt = new Date().toISOString();
      this.tasks.set(taskId, task);

      return result;
    } catch (error) {
      task.status = 'failed';
      task.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      task.updatedAt = new Date().toISOString();
      this.tasks.set(taskId, task);

      return {
        success: false,
        message: task.errorMessage
      };
    }
  }

  /**
   * Cancel a task
   */
  cancel(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.status = 'cancelled';
    task.updatedAt = new Date().toISOString();
    this.tasks.set(taskId, task);
  }

  /**
   * Get a task by ID
   */
  getTask(taskId: string): TaskInstance | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): TaskInstance[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: TaskStatus): TaskInstance[] {
    return Array.from(this.tasks.values()).filter(t => t.status === status);
  }

  /**
   * Check if all required slots are filled
   */
  private hasRequiredSlots(template: TaskTemplate, slots: Record<string, unknown>): boolean {
    return template.slots
      .filter(s => s.required)
      .every(s => s.name in slots);
  }

  /**
   * Validate all slots
   */
  private validateSlots(template: TaskTemplate, slots: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [name, value] of Object.entries(slots)) {
      const slot = template.slots.find(s => s.name === name);
      if (!slot) {
        errors.push(`Unknown slot: ${name}`);
        continue;
      }

      if (slot.validation) {
        const result = slot.validation(value);
        if (result !== true) {
          errors.push(`${name}: ${result}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

/**
 * Global task runtime instance
 */
export const taskRuntime = new TaskRuntime();
