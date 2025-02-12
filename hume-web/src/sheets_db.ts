import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { Emotion } from './types';

export class SheetsDB {
  private spreadsheetId: string;
  private client: JWT | null;
  private sheets: any;

  constructor(spreadsheetId = process.env.GOOGLE_SHEETS_ID) {
    this.spreadsheetId = spreadsheetId || '';
    this.client = null;
    this.sheets = null;
  }

  connect(): boolean {
    try {
      // Load credentials from environment variables
      const credentials = {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      };

      if (!credentials.client_email || !credentials.private_key) {
        throw new Error('Missing Google credentials');
      }

      // Create JWT client
      this.client = new JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      // Initialize sheets API
      this.sheets = google.sheets({ version: 'v4', auth: this.client });

      return true;
    } catch (error) {
      console.error('Connection error:', error);
      return false;
    }
  }

  async store_emotion_data(text: string, emotions: Emotion[]): Promise<boolean> {
    try {
      if (!this.sheets || !this.spreadsheetId) {
        if (!this.connect()) {
          return false;
        }
      }

      // Prepare row data
      const timestamp = new Date().toISOString();
      const row = [
        timestamp,
        text,
        ...emotions.map(e => e.score.toString()),
      ];

      // Append to sheet
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'Sheet1',
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [row],
        },
      });

      return true;
    } catch (error) {
      console.error('Error storing emotion data:', error);
      return false;
    }
  }
} 