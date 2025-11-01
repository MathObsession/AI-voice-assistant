
export enum AssistantState {
  IDLE = 'IDLE',
  PASSIVE_LISTENING = 'PASSIVE_LISTENING',
  THINKING = 'THINKING',
  SPEAKING = 'SPEAKING',
  ERROR = 'ERROR'
}

export interface TranscriptMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  isFinal: boolean;
}
