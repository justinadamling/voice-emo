'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  VStack,
  Text,
  useToast,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from '@chakra-ui/react';

export const RecordingSection = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [emotions, setEmotions] = useState<Array<{ name: string; score: number }>>([]);
  const toast = useToast();

  // Debug logs
  useEffect(() => {
    console.log('Component mounted');
  }, []);

  useEffect(() => {
    console.log('Audio URL changed:', audioUrl);
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      console.log('Requesting media permissions...');
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          }
        });
        console.log('Media permission granted');
      } catch (err) {
        console.error('Media permission error:', err);
        toast({
          title: 'Microphone access denied',
          description: 'Please allow microphone access to record audio',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      console.log('Creating recorder...');
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        console.log('WebM not supported, trying alternative format');
        mimeType = 'audio/mp4';
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: mimeType
      });
      
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        console.log('Data available:', e.data.size);
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        console.log('Recording stopped, creating blob...');
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        console.log('Created URL:', url);
        setAudioUrl(url);
      };

      recorder.onerror = (e) => {
        console.error('Recorder error:', e);
        toast({
          title: 'Recording error',
          description: 'An error occurred while recording',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      };

      console.log('Starting recorder...');
      recorder.start(100);
      setMediaRecorder(recorder);
      setIsRecording(true);
      setEmotions([]);
      
      toast({
        title: 'Recording started',
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
    console.log('Stopping recording...');
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        
        toast({
          title: 'Recording complete',
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
      } catch (error) {
        console.error('Error stopping recording:', error);
        toast({
          title: 'Error stopping recording',
          description: error instanceof Error ? error.message : 'Unknown error',
          status: 'error',
          duration: 4000,
          isClosable: true,
        });
      }
    }
  };

  const analyzeRecording = async () => {
    if (!audioUrl) return;

    try {
      setIsAnalyzing(true);
      toast({
        title: 'Analyzing recording...',
        status: 'info',
        duration: 2000,
      });

      const response = await fetch(audioUrl);
      const audioBlob = await response.blob();

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const result = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!result.ok) {
        const error = await result.json();
        console.error('Error from backend:', error);
        throw new Error(error.detail || 'Failed to analyze recording');
      }

      const data = await result.json();
      setEmotions(data.emotions);
      toast({
        title: 'Analysis complete',
        status: 'success',
        duration: 2000,
      });
    } catch (error) {
      console.error('Error analyzing recording:', error);
      toast({
        title: error instanceof Error ? error.message : 'Error analyzing recording',
        status: 'error',
        duration: 4000,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <VStack spacing={4} align="center" w="100%" maxW="500px" p={4}>
      <Button
        colorScheme={isRecording ? 'red' : 'blue'}
        onClick={isRecording ? stopRecording : startRecording}
        size="lg"
        w="full"
        isDisabled={isAnalyzing}
      >
        {isRecording ? 'Stop Recording' : 'Speak'}
      </Button>

      {audioUrl && (
        <Box w="100%">
          <audio src={audioUrl} controls style={{ width: '100%' }} />
          <Button
            mt={4}
            colorScheme="green"
            onClick={analyzeRecording}
            isLoading={isAnalyzing}
            loadingText="Analyzing..."
            w="full"
          >
            Check Emotions
          </Button>
        </Box>
      )}

      {emotions.length > 0 && (
        <Box w="100%" mt={4}>
          <Text mb={2} fontWeight="bold">Detected Emotions:</Text>
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>Emotion</Th>
                <Th isNumeric>Probability</Th>
              </Tr>
            </Thead>
            <Tbody>
              {emotions
                .sort((a, b) => b.score - a.score)
                .slice(0, 10)
                .map((emotion) => (
                  <Tr key={emotion.name}>
                    <Td>{emotion.name}</Td>
                    <Td isNumeric>{(emotion.score * 100).toFixed(1)}%</Td>
                  </Tr>
                ))}
            </Tbody>
          </Table>
        </Box>
      )}
    </VStack>
  );
}; 