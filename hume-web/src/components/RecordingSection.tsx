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
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toast = useToast();

  // Process buffered chunks
  const processBufferedChunks = async (chunks: Blob[]) => {
    if (chunks.length === 0) return;
    
    try {
      // Simply combine the chunks, preserving the original WebM structure
      const combinedBlob = new Blob(chunks, { type: 'audio/webm' });
      console.log(`Processing ${chunks.length} chunks, total size: ${combinedBlob.size} bytes`);
      
      const formData = new FormData();
      formData.append('file', combinedBlob, 'audio.webm');

      const response = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();
      if (onEmotionsUpdate && data.emotions) {
        onEmotionsUpdate(data.emotions);
      }
    } catch (error) {
      console.error('Error processing chunks:', error);
      toast({
        title: 'Error processing audio',
        description: error instanceof Error ? error.message : 'Failed to process audio',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
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
      let isFirstChunk = true;
      
      recorder.ondataavailable = async (e) => {
        if (e.data.size > 0) {
          console.log(`Received chunk of size: ${e.data.size} bytes${isFirstChunk ? ' (contains headers)' : ''}`);
          
          if (isFirstChunk) {
            // Store the first chunk separately as it contains the WebM headers
            chunksRef.current = [e.data];
            isFirstChunk = false;
          } else {
            chunksRef.current.push(e.data);
            
            // Process when we have enough data (first chunk + 1 more chunk)
            if (chunksRef.current.length >= 2) {
              const chunksToProcess = chunksRef.current.slice();
              // Keep the first chunk (with headers) and last chunk
              chunksRef.current = [chunksRef.current[0], chunksRef.current[chunksRef.current.length - 1]];
              await processBufferedChunks(chunksToProcess);
            }
          }
        }
      };

      // Start recording in 3-second chunks
      recorder.start(3000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      
      toast({
        title: 'Recording started',
        description: 'Processing audio in chunks...',
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
      
      // Process any remaining audio
      if (chunksRef.current.length > 0) {
        processBufferedChunks(chunksRef.current);
        chunksRef.current = [];
      }
      
      toast({
        title: 'Recording complete',
        status: 'success',
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