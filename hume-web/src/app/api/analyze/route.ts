import { NextResponse } from 'next/server';
import { SheetsService } from '@/services/sheets';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioBlob = formData.get('audio') as Blob;

    if (!audioBlob) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Send to API
    const response = await SheetsService.storeEmotionData('', [], '');

    if (!response) {
      return NextResponse.json(
        { error: 'Failed to store results' },
        { status: 500 }
      );
    }

    // Return analysis results
    return NextResponse.json(response);

  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 