import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

export class AuthService {
  constructor() {
    this.oauth2Client = null;
    this.tokenPath = './data/youtube-oauth-token.json';
    this.credentialsPath = './credentials.json'; // You'll need to add this file
  }

  async initialize() {
    // Load client credentials
    if (!fs.existsSync(this.credentialsPath)) {
      throw new Error('OAuth2 credentials file not found. Please download credentials.json from Google Cloud Console.');
    }

    const credentials = JSON.parse(fs.readFileSync(this.credentialsPath));
    const { client_secret, client_id, redirect_uris } = credentials.web || credentials.installed;

    this.oauth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0] || 'http://localhost:3000/auth/callback'
    );

    // Load existing token if available
    if (fs.existsSync(this.tokenPath)) {
      const token = JSON.parse(fs.readFileSync(this.tokenPath));
      this.oauth2Client.setCredentials(token);
    }

    return this.oauth2Client;
  }

  getAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.force-ssl'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  async handleCallback(code) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    
    // Save token for future use
    if (!fs.existsSync('./data')) {
      fs.mkdirSync('./data', { recursive: true });
    }
    fs.writeFileSync(this.tokenPath, JSON.stringify(tokens));
    
    return tokens;
  }

  async getYouTubeService() {
    if (!this.oauth2Client) {
      throw new Error('OAuth2 client not initialized');
    }

    // Check if token needs refresh
    if (this.oauth2Client.credentials.expiry_date && 
        this.oauth2Client.credentials.expiry_date <= Date.now()) {
      try {
        await this.oauth2Client.refreshAccessToken();
        const tokens = this.oauth2Client.credentials;
        fs.writeFileSync(this.tokenPath, JSON.stringify(tokens));
      } catch (error) {
        throw new Error('Token refresh failed. Re-authentication required.');
      }
    }

    return google.youtube({ version: 'v3', auth: this.oauth2Client });
  }

  isAuthenticated() {
    return this.oauth2Client && 
           this.oauth2Client.credentials && 
           this.oauth2Client.credentials.access_token;
  }

  clearTokens() {
    if (fs.existsSync(this.tokenPath)) {
      fs.unlinkSync(this.tokenPath);
    }
    if (this.oauth2Client) {
      this.oauth2Client.setCredentials({});
    }
  }
}