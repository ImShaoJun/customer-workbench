export type DiagnosisState = 'IDLE' | 'UPLOADING' | 'DIAGNOSING' | 'SUCCESS' | 'ERROR';

export interface LogFile {
  name: string;
  content: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[]; // Base64 encoded images
  logFiles?: LogFile[]; // Uploaded text/log files
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
