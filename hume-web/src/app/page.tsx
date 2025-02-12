'use client';

import { Box, Container, Heading, Text } from '@chakra-ui/react';
import { RecordingSection } from '../components/RecordingSection';

export default function Home() {
  return (
    <Container maxW="container.md" py={10}>
      <Box textAlign="center" mb={10}>
        <Heading as="h1" mb={4}>
          What am I feeling?
        </Heading>
        <Text fontSize="lg" color="gray.600">
          Speak, and we'll detect the emotions in your voice.
        </Text>
      </Box>

      <Box display="flex" justifyContent="center">
        <RecordingSection />
      </Box>
    </Container>
  );
}
