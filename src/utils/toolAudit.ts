/**
 * Tool Audit Logging
 *
 * Records all tool invocations with request/response details for auditability
 * and traceability. Integrates with project notes for persistent storage.
 */

import { getCurrentProjectDatabase } from './projectDatabase';

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
    const db = await getCurrentProjectDatabase();
    if (!db) {
      // No active project - log to console only
      console.warn('[TOOL AUDIT]', JSON.stringify(entry, null, 2));
      return;
    }

    // Create audit note with structured format
    const title = `Tool Audit: ${entry.toolName}`;
    const content = formatAuditEntry(entry);

    await db.addNote(title, content, ['tool-audit']);
    db.close();
  } catch (error) {
    // Non-fatal - log to console if note creation fails
    console.error('Failed to create audit note:', error);
    console.warn('[TOOL AUDIT]', JSON.stringify(entry, null, 2));
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

  parts.push(
    `\n### Parameters\n\n\`\`\`json\n${JSON.stringify(entry.parameters, null, 2)}\n\`\`\``
  );

  if (entry.result !== undefined) {
    const resultStr =
      typeof entry.result === 'string' ? entry.result : JSON.stringify(entry.result, null, 2);
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
    const db = await getCurrentProjectDatabase();
    if (!db) {
      return [];
    }

    const notes = db.searchNotes('tool-audit');
    const filtered = toolName ? notes.filter(note => note.title.includes(toolName)) : notes;

    const entries = filtered.slice(0, limit).map(note => {
      // Parse audit entry from note content
      // This is simplified - would need more robust parsing
      return {
        timestamp: note.createdAt,
        toolName: note.title.replace('Tool Audit: ', ''),
        parameters: {}
        // Would parse from content in real implementation
      };
    });

    db.close();
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
    const db = await getCurrentProjectDatabase();
    if (!db) {
      return { totalCalls: 0, toolCounts: {}, errorCount: 0 };
    }

    const auditNotes = db.searchNotes('tool-audit');
    const toolCounts: Record<string, number> = {};
    let errorCount = 0;

    for (const note of auditNotes) {
      const toolName = note.title.replace('Tool Audit: ', '');
      toolCounts[toolName] = (toolCounts[toolName] || 0) + 1;

      if (note.content.includes('### Error')) {
        errorCount++;
      }
    }

    db.close();

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
