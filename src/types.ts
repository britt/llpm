export interface Message {
  role: 'user' | 'assistant' | 'system' | 'ui-notification';
  content: string;
  id?: string;
}
