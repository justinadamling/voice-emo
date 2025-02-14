'use client';

import { useState, useEffect, useRef } from 'react';
import { useToast } from '@chakra-ui/react';
import { Badge } from '@/subframe/components/Badge';

interface EmotionScore {
  name: string;
  score: number;
}

interface WeightedEmotion {
  name: string;
  totalScore: number;
  weight: number;
}

interface RecordingSectionProps {
  onEmotionsUpdate?: (emotions: Array<{ name: string; score: number }>, isFinal: boolean) => void;
  onRecordingStart?: () => void;
}

export const RecordingSection = ({ onEmotionsUpdate, onRecordingStart }: RecordingSectionProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const webmHeaderRef = useRef<Blob | null>(null);
  const weightedEmotionsRef = useRef<Map<string, WeightedEmotion>>(new Map());
  const toast = useToast();

  // Calculate weighted average of emotions
  const updateWeightedEmotions = (emotions: EmotionScore[], chunkDuration: number) => {
    try {
      const totalDuration = Math.max(recordingDuration, chunkDuration);  // Ensure we never divide by zero
      const chunkWeight = chunkDuration / totalDuration;

      console.log(`Updating weights - Total Duration: ${totalDuration}s, Chunk Duration: ${chunkDuration}s, Weight: ${chunkWeight}`);

      emotions.forEach(({ name, score }) => {
        const existing = weightedEmotionsRef.current.get(name);
        if (existing) {
          // Adjust previous weight and add new weighted score
          const adjustedWeight = existing.weight / (1 + chunkWeight);
          const newWeight = adjustedWeight + chunkWeight;
          const newTotalScore = (existing.totalScore * adjustedWeight) + (score * chunkWeight);
          
          console.log(`Emotion: ${name}, Previous Score: ${existing.totalScore}, New Score: ${newTotalScore}`);
          
          weightedEmotionsRef.current.set(name, {
            name,
            totalScore: newTotalScore,
            weight: newWeight
          });
        } else {
          // First occurrence of this emotion
          console.log(`New emotion detected: ${name}, Initial Score: ${score * chunkWeight}`);
          
          weightedEmotionsRef.current.set(name, {
            name,
            totalScore: score * chunkWeight,
            weight: chunkWeight
          });
        }
      });

      // Convert weighted emotions to final format
      const weightedResults = Array.from(weightedEmotionsRef.current.values())
        .map(({ name, totalScore, weight }) => ({
          name,
          score: weight > 0 ? totalScore / weight : 0  // Prevent division by zero
        }))
        .sort((a, b) => b.score - a.score);

      console.log('Weighted Results:', weightedResults);

      // Update UI with weighted results
      if (weightedResults.length > 0) {
        onEmotionsUpdate?.(weightedResults, false);
      }
    } catch (error) {
      console.error('Error in updateWeightedEmotions:', error);
      // Don't throw the error to prevent breaking the recording flow
    }
  };

  // Process a single chunk for real-time feedback
  const processChunk = async (chunk: Blob) => {
    try {
      // Store first chunk's header
      if (chunksRef.current.length === 1) {
        webmHeaderRef.current = chunk;
        console.log('Stored first chunk as WebM header');
        return; // Skip processing the first chunk
      }

      // Only process every third chunk to reduce server load
      if (chunksRef.current.length % 3 !== 0) {
        console.log('Skipping chunk to reduce server load');
        return;
      }

      console.log(`Processing chunk ${chunksRef.current.length} of size: ${chunk.size} bytes`);
      
      // Combine header with current chunk
      const audioToProcess = new Blob(
        [webmHeaderRef.current!, chunk],
        { type: 'audio/webm' }
      );
      
      const formData = new FormData();
      formData.append('file', audioToProcess, 'chunk_audio.webm');

      const response = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Server error (${response.status}):`, errorText);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Server response:', data);

      if (onEmotionsUpdate && data.emotions && data.emotions.length > 0) {
        // Update weighted average with 9-second chunk (since we're processing every third chunk)
        updateWeightedEmotions(data.emotions, 9);
      } else {
        console.log('No emotions in chunk response:', data);
      }
    } catch (error) {
      console.error('Error processing chunk:', error);
      // Don't show toast for chunk errors to avoid spam
    }
  };

  // Process the complete audio file for final results
  const processCompleteAudio = async (chunks: Blob[], uxStartTime: number) => {
    try {
      setIsProcessing(true);
      
      // Combine all chunks with the header
      const completeAudio = new Blob(
        [webmHeaderRef.current!, ...chunks.slice(1)],
        { type: 'audio/webm' }
      );
      
      console.log(`Processing complete audio of size: ${completeAudio.size} bytes`);
      
      const formData = new FormData();
      formData.append('file', completeAudio, 'complete_audio.webm');

      const response = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Server error (${response.status}):`, errorText);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      if (onEmotionsUpdate && data.emotions) {
        onEmotionsUpdate(data.emotions, true); // true indicates this is final
      }

      // Calculate and log UX speed
      const uxEndTime = Date.now();
      const uxSpeed = (uxEndTime - uxStartTime) / 1000;
      console.log('🎯 UX Speed:', uxSpeed.toFixed(2), 'seconds');
      console.log('🎯 Backend Timing:', data.timing);
      
      toast({
        title: 'Analysis Complete',
        description: `Total: ${uxSpeed.toFixed(1)}s
Backend: ${data.timing.total.toFixed(1)}s
• Submit: ${data.timing.analysis.submit.toFixed(1)}s
• Poll: ${data.timing.analysis.poll.toFixed(1)}s
• Predict: ${data.timing.analysis.predict.toFixed(1)}s`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error processing audio:', error);
      toast({
        title: 'Processing error',
        description: error instanceof Error ? error.message : 'Failed to process audio',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecording = async () => {
    try {
      // Notify parent that recording is starting
      onRecordingStart?.();
      
      // Reset states
      weightedEmotionsRef.current = new Map();
      webmHeaderRef.current = null;
      
      console.log('Requesting media permissions...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
          channelCount: 1
        }
      });

      const mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        throw new Error('WebM with Opus codec is not supported in this browser');
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        audioBitsPerSecond: 128000
      });

      // Reset state
      setRecordingDuration(0);
      chunksRef.current = [];
      
      // Handle chunks for both real-time and final analysis
      recorder.ondataavailable = async (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          // Process chunk for real-time feedback
          await processChunk(e.data);
        }
      };

      // Start recording with longer chunks
      recorder.start(3000); // Keep at 3 seconds for smoother UI updates
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      toast({
        title: 'Recording started',
        description: 'Recording your voice...',
        status: 'info',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Error starting recording',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    }
  };

  const stopRecording = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      // Start UX speed timing
      const uxStartTime = Date.now();
      console.log('🕒 UX Speed Tracking - Start:', uxStartTime);
      
      // Stop recording
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);

      // Clear duration timer
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      
      // Process complete audio for final analysis
      if (chunksRef.current.length > 0) {
        await processCompleteAudio(chunksRef.current, uxStartTime);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`w-full px-6 py-3 text-white font-medium rounded-lg transition-colors ${
          isRecording 
            ? 'bg-error-600 hover:bg-error-700' 
            : 'bg-brand-600 hover:bg-brand-700'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        disabled={isProcessing}
      >
        <div className="flex items-center justify-center gap-2">
          {isRecording ? (
            <>
              <Badge variant="error">Recording</Badge>
              <Badge variant="neutral">{formatDuration(recordingDuration)}</Badge>
            </>
          ) : isProcessing ? (
            <Badge variant="warning">Processing Final Analysis</Badge>
          ) : null}
          <span className="text-body font-body">
            {isRecording ? 'Stop Recording' : isProcessing ? 'Processing...' : 'Start Recording'}
          </span>
        </div>
      </button>
      {isProcessing && (
        <div className="text-sm text-gray-600">
          Processing final analysis... This may take a few seconds.
        </div>
      )}
    </div>
  );
}; 