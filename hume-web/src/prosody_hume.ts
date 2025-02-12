import { ProsodyResult } from './types';

export async function analyze_prosody(audioFile: string): Promise<ProsodyResult | null> {
  try {
    const apiKey = process.env.HUME_API_KEY;
    if (!apiKey) {
      throw new Error('HUME_API_KEY not found in environment variables');
    }

    // Create form data with audio file
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('models', JSON.stringify({ prosody: {} }));

    // Send request to Hume API
    const response = await fetch('https://api.hume.ai/v0/batch/jobs', {
      method: 'POST',
      headers: {
        'X-Hume-Api-Key': apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Hume API error: ${response.statusText}`);
    }

    const { job_id } = await response.json();

    // Poll for job completion
    while (true) {
      const statusResponse = await fetch(`https://api.hume.ai/v0/batch/jobs/${job_id}`, {
        headers: {
          'X-Hume-Api-Key': apiKey,
        },
      });

      if (!statusResponse.ok) {
        throw new Error(`Failed to check job status: ${statusResponse.statusText}`);
      }

      const { state } = await statusResponse.json();

      if (state.status === 'COMPLETED') {
        // Get results
        const resultsResponse = await fetch(`https://api.hume.ai/v0/batch/jobs/${job_id}/predictions`, {
          headers: {
            'X-Hume-Api-Key': apiKey,
          },
        });

        if (!resultsResponse.ok) {
          throw new Error(`Failed to get results: ${resultsResponse.statusText}`);
        }

        const results = await resultsResponse.json();
        return results as ProsodyResult;
      }

      if (state.status === 'FAILED') {
        throw new Error('Job failed');
      }

      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error('Error analyzing prosody:', error);
    return null;
  }
} 