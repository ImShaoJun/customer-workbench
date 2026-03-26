export type DiagnosisState = 'IDLE' | 'DIAGNOSING' | 'SUCCESS' | 'ERROR';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[]; // Base64 encoded images
  timestamp: number;
  isStreaming?: boolean;
}

export interface StreamEventPayload {
  type: 'assistant' | 'partial_assistant' | 'result' | 'status';
  content?: string;
  subtype?: string;
  result?: string;
  message?: string;
  details?: any;
}
