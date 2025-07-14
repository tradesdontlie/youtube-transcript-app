import express from 'express';
import cors from 'cors';
import { TranscriptService } from './services/transcriptService.js';
import { DatabaseService } from './services/databaseService.js';
import { AuthService } from './services/authService.js';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const dbService = new DatabaseService();
const authService = new AuthService();
const transcriptService = new TranscriptService(dbService, authService);

await dbService.initialize();
try {
  await authService.initialize();
  console.log('OAuth2 initialized successfully');
} catch (error) {
  console.log('OAuth2 setup required:', error.message);
}

app.post('/api/fetch-transcript', async (req, res) => {
  try {
    const { videoUrl } = req.body;
    const result = await transcriptService.fetchAndStore(videoUrl);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/transcripts', async (req, res) => {
  try {
    const transcripts = await transcriptService.getAllTranscripts();
    res.json(transcripts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/transcripts/:id', async (req, res) => {
  try {
    const transcript = await transcriptService.getTranscript(req.params.id);
    res.json(transcript);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/transcripts/:id', async (req, res) => {
  try {
    await transcriptService.deleteTranscript(req.params.id);
    res.json({ success: true, message: 'Transcript deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    const results = await transcriptService.searchTranscripts(q);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// OAuth2 Authentication Routes
app.get('/auth', async (req, res) => {
  try {
    const authUrl = authService.getAuthUrl();
    res.redirect(authUrl);
  } catch (error) {
    res.status(500).json({ error: 'OAuth2 setup required. Please add credentials.json file.' });
  }
});

app.get('/auth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    await authService.handleCallback(code);
    
    // Redirect to a success page or main app
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Successful</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
          .success { color: #4CAF50; text-align: center; }
          .info { background: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .button { background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 5px; }
          .test-urls { background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; }
          pre { background: #f5f5f5; padding: 10px; border-radius: 3px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <h1 class="success">🎉 Authentication Successful!</h1>
        <div class="info">
          <p><strong>OAuth2 authentication completed successfully!</strong></p>
          <p>Your YouTube Transcript App now has full API access to download transcripts.</p>
        </div>
        
        <h2>🚀 Test Transcript Fetching</h2>
        <div class="test-urls">
          <p><strong>Try these API endpoints:</strong></p>
          <p><a href="/api/auth/status" class="button">Check Auth Status</a></p>
          <p><a href="/api/transcripts" class="button">View All Transcripts</a></p>
          
          <h3>Test with curl:</h3>
          <pre>curl -X POST http://localhost:3000/api/fetch-transcript \\
  -H "Content-Type: application/json" \\
  -d '{"videoUrl": "https://www.youtube.com/watch?v=kJQP7kiw5Fk"}'</pre>
        </div>
        
        <p style="text-align: center; margin-top: 30px;">
          <a href="/" class="button">Return to App</a>
        </p>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Authentication Error</title></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
        <h1 style="color: #f44336;">❌ Authentication Failed</h1>
        <p><strong>Error:</strong> ${error.message}</p>
        <p><a href="/auth">Try Again</a></p>
      </body>
      </html>
    `);
  }
});

app.get('/api/auth/status', (req, res) => {
  res.json({ 
    authenticated: authService.isAuthenticated(),
    message: authService.isAuthenticated() 
      ? 'Authenticated - full transcript access available'
      : 'Not authenticated - limited transcript access'
  });
});

app.post('/api/auth/logout', (req, res) => {
  authService.clearTokens();
  res.json({ success: true, message: 'Logged out successfully' });
});

app.listen(PORT, () => {
  console.log(`YouTube Transcript App running on http://localhost:${PORT}`);
  console.log(`OAuth2 setup: Visit http://localhost:${PORT}/auth to authenticate`);
});