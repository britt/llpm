import { appendFile, readFile, readdir, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { ShellAuditEntry } from '../types/shell';

export class ShellAuditLogger {
  private auditDir: string;

  constructor(auditDir: string) {
    this.auditDir = auditDir;
  }

  private getAuditFilePath(): string {
    const date = new Date().toISOString().split('T')[0];
    return join(this.auditDir, `shell-audit-${date}.jsonl`);
  }

  async log(entry: ShellAuditEntry): Promise<void> {
    try {
      // Ensure audit directory exists
      if (!existsSync(this.auditDir)) {
        await mkdir(this.auditDir, { recursive: true });
      }

      const filePath = this.getAuditFilePath();
      const line = JSON.stringify(entry) + '\n';

      await appendFile(filePath, line, 'utf-8');
    } catch (error) {
      // Don't throw - audit logging should not block execution
      console.error('Failed to write shell audit log:', error);
    }
  }

  async getRecentEntries(limit: number = 100): Promise<ShellAuditEntry[]> {
    const entries: ShellAuditEntry[] = [];

    try {
      if (!existsSync(this.auditDir)) {
        return entries;
      }

      const files = await readdir(this.auditDir);
      const auditFiles = files
        .filter(f => f.startsWith('shell-audit-') && f.endsWith('.jsonl'))
        .sort()
        .reverse();

      for (const file of auditFiles) {
        if (entries.length >= limit) break;

        const content = await readFile(join(this.auditDir, file), 'utf-8');
        const lines = content.trim().split('\n').filter(Boolean);

        for (const line of lines.reverse()) {
          if (entries.length >= limit) break;
          try {
            entries.push(JSON.parse(line));
          } catch {
            // Skip malformed entries
          }
        }
      }
    } catch (error) {
      console.error('Failed to read shell audit logs:', error);
    }

    return entries;
  }
}

// Singleton instance
let globalAuditLogger: ShellAuditLogger | null = null;

export function getShellAuditLogger(auditDir?: string): ShellAuditLogger {
  if (!globalAuditLogger && auditDir) {
    globalAuditLogger = new ShellAuditLogger(auditDir);
  }
  if (!globalAuditLogger) {
    throw new Error('Shell audit logger not initialized');
  }
  return globalAuditLogger;
}

export function initShellAuditLogger(auditDir: string): ShellAuditLogger {
  globalAuditLogger = new ShellAuditLogger(auditDir);
  return globalAuditLogger;
}
