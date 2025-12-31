/**
 * Tool Audit Logging
 *
 * Records all tool invocations with request/response details for auditability
 * and traceability. Integrates with project notes for persistent storage.
 */

import { getCurrentProject } from './projectConfig';
import { getNotesBackend } from '../services/notesBackend';

export interface ToolAuditEntry {
  timestamp: string;
  toolName: string;
  parameters: Record<string, any>;
  result?: any;
  error?: string;
  duration?: number;
  userId?: string;
  sessionId?: string;
}

/**
 * Log a tool invocation to the audit trail
 */
export async function auditToolCall(entry: ToolAuditEntry): Promise<void> {
  try {
    const currentProject = await getCurrentProject();
    if (!currentProject) {
      // No active project - log to console only
      console.log('[TOOL AUDIT]', JSON.stringify(entry, null, 2));
      return;
    }

    const backend = await getNotesBackend(currentProject.id);

    // Create audit note with structured format
    const title = `Tool Audit: ${entry.toolName}`;
    const content = formatAuditEntry(entry);

    await backend.addNote(title, content, ['tool-audit']);
  } catch (error) {
    // Non-fatal - log to console if note creation fails
    console.error('Failed to create audit note:', error);
    console.log('[TOOL AUDIT]', JSON.stringify(entry, null, 2));
  }
}

/**
 * Format audit entry for note storage
 */
function formatAuditEntry(entry: ToolAuditEntry): string {
  const parts: string[] = [];

  parts.push(`## Tool Invocation Audit`);
  parts.push(`\n**Tool**: ${entry.toolName}`);
  parts.push(`**Timestamp**: ${entry.timestamp}`);

  if (entry.userId) {
    parts.push(`**User**: ${entry.userId}`);
  }

  if (entry.sessionId) {
    parts.push(`**Session**: ${entry.sessionId}`);
  }

  if (entry.duration !== undefined) {
    parts.push(`**Duration**: ${entry.duration}ms`);
  }

  parts.push(`\n### Parameters\n\n\`\`\`json\n${JSON.stringify(entry.parameters, null, 2)}\n\`\`\``);

  if (entry.result !== undefined) {
    const resultStr = typeof entry.result === 'string'
      ? entry.result
      : JSON.stringify(entry.result, null, 2);
    parts.push(`\n### Result\n\n\`\`\`\n${resultStr}\n\`\`\``);
  }

  if (entry.error) {
    parts.push(`\n### Error\n\n\`\`\`\n${entry.error}\n\`\`\``);
  }

  parts.push(`\n---\n*Audit log generated automatically by LLPM*`);

  return parts.join('\n');
}

/**
 * Query audit logs for a specific tool
 */
export async function getAuditLogs(
  toolName?: string,
  limit: number = 50
): Promise<ToolAuditEntry[]> {
  try {
    const currentProject = await getCurrentProject();
    if (!currentProject) {
      return [];
    }

    const backend = await getNotesBackend(currentProject.id);

    let notes;
    if (toolName) {
      // List all notes with tool-audit tag and filter by tool name
      const allNotes = await backend.listNotes();
      notes = allNotes.filter(note =>
        note.tags.includes('tool-audit') && note.title.includes(toolName)
      );
    } else {
      // Search for all tool-audit notes
      const results = await backend.searchNotes('tool-audit');
      notes = results.map(r => ({
        id: r.id,
        title: r.title,
        tags: ['tool-audit'],
        createdAt: '',
        updatedAt: ''
      }));
    }

    const entries = notes.slice(0, limit).map(note => {
      // Parse audit entry from note
      // This is simplified - would need more robust parsing
      return {
        timestamp: note.createdAt || new Date().toISOString(),
        toolName: note.title.replace('Tool Audit: ', ''),
        parameters: {},
        // Would parse from content in real implementation
      };
    });

    return entries;
  } catch (error) {
    console.error('Failed to retrieve audit logs:', error);
    return [];
  }
}

/**
 * Get audit statistics
 */
export async function getAuditStats(): Promise<{
  totalCalls: number;
  toolCounts: Record<string, number>;
  errorCount: number;
}> {
  try {
    const currentProject = await getCurrentProject();
    if (!currentProject) {
      return { totalCalls: 0, toolCounts: {}, errorCount: 0 };
    }

    const backend = await getNotesBackend(currentProject.id);

    // Get all notes with tool-audit tag
    const allNotes = await backend.listNotes();
    const auditNotes = allNotes.filter(note => note.tags.includes('tool-audit'));

    const toolCounts: Record<string, number> = {};
    let errorCount = 0;

    // Need to fetch full content to check for errors
    for (const note of auditNotes) {
      const toolName = note.title.replace('Tool Audit: ', '');
      toolCounts[toolName] = (toolCounts[toolName] || 0) + 1;

      // Get full note content to check for errors
      const fullNote = await backend.getNote(note.id);
      if (fullNote && fullNote.content.includes('### Error')) {
        errorCount++;
      }
    }

    return {
      totalCalls: auditNotes.length,
      toolCounts,
      errorCount
    };
  } catch (error) {
    console.error('Failed to retrieve audit stats:', error);
    return { totalCalls: 0, toolCounts: {}, errorCount: 0 };
  }
}
