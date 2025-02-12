export interface Emotion {
  name: string;
  score: number;
}

export interface ProsodyResult {
  prosody: {
    predictions: Array<{
      emotions: Emotion[];
      time: {
        begin: number;
        end: number;
      };
    }>;
  };
} 