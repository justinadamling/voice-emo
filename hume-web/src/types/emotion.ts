export interface Emotion {
  name: string;
  score: number;
}

export interface TimeRange {
  begin: number;
  end: number;
}

export interface ProsodyPrediction {
  emotions: Emotion[];
  time: TimeRange;
}

export interface ProsodyResult {
  prosody: {
    predictions: ProsodyPrediction[];
  };
}

export interface EmotionData {
  text: string;
  emotions: Emotion[];
  timestamp?: string;
  audioId?: string;
  context?: string;
} 