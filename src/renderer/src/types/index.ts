export type DiagnosisState = 'IDLE' | 'DIAGNOSING' | 'SUCCESS' | 'ERROR';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  // Data URL images (e.g. data:image/png;base64,...) sent with user message.
  images?: string[];
  timestamp: number;
  isStreaming?: boolean;
}

export interface StreamEventPayload {
  type: 'assistant' | 'partial_assistant' | 'result' | 'status';
  content?: string;
  subtype?: string;
  result?: string;
  message?: string;
  details?: unknown;
}
