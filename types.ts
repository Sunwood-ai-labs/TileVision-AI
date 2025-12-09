export interface QueuedVideo {
  id: string;
  file: File;
  url: string;
  duration?: number;
  thumbnail?: string; // Base64 thumbnail for AI analysis
}

export enum ExportStatus {
  IDLE = 'IDLE',
  PREPARING = 'PREPARING',
  RECORDING = 'RECORDING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export interface GridConfig {
  width: number;
  height: number;
  gap: number;
  backgroundColor: string;
  includeAudio: boolean;
}

export type GridPosition = 0 | 1 | 2 | 3; // Top-Left, Top-Right, Bottom-Left, Bottom-Right
