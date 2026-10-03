import { Property } from './property';

export interface ChatResponse {
  answer: string;
  data: Property[];
  applied_filters?: Record<string, any>;
  suggestions?: string[];
}

export interface AudioPayload {
  data: string;
  mimeType: string;
}
