import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { Emotion } from '../types/emotion';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class SheetsService {
  static async storeEmotionData(text: string, emotions: any, context: string = '') {
    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, context }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to analyze and store emotion data');
    }

    return response.json();
  }

  static async getLatestEntries(limit: number = 10) {
    const response = await fetch(`${API_BASE_URL}/latest-entries?limit=${limit}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch latest entries');
    }

    return response.json();
  }
}

export class SheetsDB {
  private spreadsheetId: string;
  private client: JWT | null;
  private sheets: any;

  constructor() {
    this.spreadsheetId = process.env.GOOGLE_SHEETS_ID || '';
    this.client = null;
    this.sheets = null;
  }

  async connect(): Promise<boolean> {
    try {
      this.client = new JWT({
        email: process.env.GOOGLE_CLIENT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive'
        ]
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.client });
      console.log('Connected to Google Sheets');
      return true;
    } catch (error) {
      console.error('Connection error:', error);
      return false;
    }
  }

  async storeEmotionData(text: string, emotions: Emotion[], context: string = 'prosody_hume'): Promise<boolean> {
    try {
      if (!this.sheets) {
        if (!await this.connect()) {
          return false;
        }
      }

      // Prepare row data
      const timestamp = new Date().toISOString().split('T')[0];
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'A:A'
      });
      const transcriptId = `T${String(response.data.values?.length || 0).padStart(3, '0')}`;

      // Convert emotions array to dictionary
      const emotionDict: { [key: string]: number } = {};
      emotions.forEach(emotion => {
        emotionDict[emotion.name] = emotion.score;
      });

      // Get headers to know which emotions to include
      const headerResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: '1:1'
      });
      const headers = headerResponse.data.values?.[0] || [];

      // Create row data matching the sheet structure
      const rowData = [
        timestamp,
        transcriptId,
        text,
        context
      ];

      // Add emotion values in the same order as headers
      headers.slice(4).forEach((header: string) => {
        rowData.push(emotionDict[header] || 0.0);
      });

      // Append the row
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'A:A',
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [rowData]
        }
      });

      console.log(`Stored transcript ${transcriptId}`);
      return true;
    } catch (error) {
      console.error('Error storing data:', error);
      return false;
    }
  }

  async getLatestEntries(limit: number = 5): Promise<any[] | null> {
    try {
      if (!this.sheets) {
        if (!await this.connect()) {
          return null;
        }
      }

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'A:Z'
      });

      const rows = response.data.values || [];
      if (rows.length <= 1) {
        return [];
      }

      // Skip header row and get last 'limit' entries
      return rows.slice(1).slice(-limit);
    } catch (error) {
      console.error('Error retrieving data:', error);
      return null;
    }
  }
} 