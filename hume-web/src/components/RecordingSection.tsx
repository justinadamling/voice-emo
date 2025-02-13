'use client';

import { useState, useEffect, useRef } from 'react';
import { useToast } from '@chakra-ui/react';
import { Badge } from '@/subframe/components/Badge';

interface RecordingSectionProps {
  onEmotionsUpdate?: (emotions: Array<{ name: string; score: number }>) => void;
}

export const RecordingSection = ({ onEmotionsUpdate }: RecordingSectionProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const chunkCountRef = useRef<number>(0);
  const toast = useToast();

  // Process chunks when we have enough for a valid WebM file
  const processChunks = async () => {
    if (chunksRef.current.length === 0) return;

    try {
      // Combine a few chunks to make a valid WebM file
      const combinedBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
      console.log(`Processing chunks, total size: ${combinedBlob.size} bytes`);
      
      const formData = new FormData();
      formData.append('file', combinedBlob, 'audio.webm');

      const response = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      if (onEmotionsUpdate && data.emotions) {
        onEmotionsUpdate(data.emotions);
      }

      // Clear processed chunks
      chunksRef.current = [];
    } catch (error) {
      console.error('Error processing chunks:', error);
    }
  };

  const startRecording = async () => {
    try {
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

      chunksRef.current = [];
      chunkCountRef.current = 0;
      
      recorder.ondataavailable = async (e) => {
        if (e.data.size > 0) {
          console.log(`Received chunk of size: ${e.data.size} bytes`);
          chunksRef.current.push(e.data);
          chunkCountRef.current += 1;

          // Process after collecting 2 chunks (6 seconds of audio)
          if (chunkCountRef.current >= 2) {
            await processChunks();
            chunkCountRef.current = 0;
          }
        }
      };

      recorder.start(3000); // Collect 3-second chunks
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      
      toast({
        title: 'Recording started',
        description: 'Recording audio...',
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

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      
      // Process any remaining chunks
      if (chunksRef.current.length > 0) {
        processChunks();
      }
      
      toast({
        title: 'Recording complete',
        description: 'Recording stopped',
        status: 'info',
        duration: 2000,
        isClosable: true,
      });
    }
  };

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`w-full px-6 py-3 text-white font-medium rounded-lg transition-colors ${
          isRecording 
            ? 'bg-error-600 hover:bg-error-700' 
            : 'bg-brand-600 hover:bg-brand-700'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        disabled={isAnalyzing}
      >
        <div className="flex items-center justify-center gap-2">
          {isRecording && <Badge variant="error">Recording & Processing</Badge>}
          <span className="text-body font-body">
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </span>
        </div>
      </button>
    </div>
  );
}; 