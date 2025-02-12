import { ProsodyResult } from '../types/emotion';

export async function analyzeProsody(audioFile: File): Promise<ProsodyResult | null> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_HUME_API_KEY;
    if (!apiKey) {
      throw new Error('HUME_API_KEY is not set');
    }

    // Create form data with the audio file and configuration
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('models', JSON.stringify({
      prosody: {}
    }));

    // Start the job
    const startResponse = await fetch('https://api.hume.ai/v0/batch/jobs', {
      method: 'POST',
      headers: {
        'X-Hume-Api-Key': apiKey,
      },
      body: formData
    });

    if (!startResponse.ok) {
      throw new Error(`Failed to start job: ${startResponse.statusText}`);
    }

    const { job_id } = await startResponse.json();

    // Poll for job completion
    let result = null;
    let attempts = 0;
    const maxAttempts = 30;
    const pollInterval = 2000; // 2 seconds

    while (attempts < maxAttempts) {
      const statusResponse = await fetch(`https://api.hume.ai/v0/batch/jobs/${job_id}/predictions`, {
        headers: {
          'X-Hume-Api-Key': apiKey,
        }
      });

      if (statusResponse.ok) {
        const data = await statusResponse.json();
        if (data.status === 'COMPLETED') {
          result = data;
          break;
        }
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
      attempts++;
    }

    if (!result) {
      throw new Error('Job timed out or failed');
    }

    return result as ProsodyResult;
  } catch (error) {
    console.error('Error analyzing prosody:', error);
    return null;
  }
} 