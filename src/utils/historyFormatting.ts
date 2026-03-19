import type { Message } from '../types';

export function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function getRoleColor(role: Message['role']): string {
  switch (role) {
    case 'user': return 'cyan';
    case 'assistant': return 'green';
    case 'system': return 'yellow';
    default: return 'gray';
  }
}
