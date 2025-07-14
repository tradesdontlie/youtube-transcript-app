# YouTube Transcript App

A powerful local YouTube transcript fetcher and organizer with OAuth2 authentication, featuring both a web API and a beautiful desktop GUI.

## 🌟 Features

### YouTube Transcript App (Backend)
- **🔐 OAuth2 Authentication**: Secure YouTube API access with token management
- **📊 SQLite Database**: Local storage for transcripts with full-text search
- **🔄 Multiple Fetching Methods**: Fallback mechanisms including Python bridge
- **🌐 REST API**: Complete API for transcript management
- **🔍 Search Functionality**: Find transcripts by content, title, or metadata

### Claudia Desktop App
- **🖥️ Beautiful GUI**: Built with Tauri 2 and React for cross-platform desktop experience
- **🤖 Custom Agents**: Create and manage specialized AI agents for different tasks
- **📈 Usage Analytics**: Track Claude API costs and token usage
- **🔌 MCP Integration**: Model Context Protocol server management
- **⏰ Session Management**: Timeline-based checkpoints and session restoration
- **📝 Project Management**: Visual browser for Claude Code projects

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v16 or later)
- **Python** 3.8+ with pip
- **Rust** (for building Claudia desktop app)
- **Bun** (for Claudia development)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/tradesdontlie/youtube-transcript-app.git
   cd youtube-transcript-app
   ```

2. **Set up the backend**
   ```bash
   # Install Node.js dependencies
   npm install
   
   # Set up Python environment
   python -m venv python_env
   source python_env/bin/activate  # On Windows: python_env\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Configure OAuth2**
   ```bash
   cp credentials.example.json credentials.json
   # Edit credentials.json with your YouTube API credentials
   ```

4. **Start the backend server**
   ```bash
   npm run dev
   ```

5. **Set up Claudia Desktop App** (Optional)
   ```bash
   cd claudia-vision-notebook
   bun install
   bun run tauri dev
   ```

## 📖 Usage

### Backend API

#### 1. Authenticate with YouTube
Navigate to `http://localhost:3000/auth` to complete OAuth2 setup.

#### 2. Fetch Transcripts
```bash
curl -X POST http://localhost:3000/api/fetch-transcript \
  -H "Content-Type: application/json" \
  -d '{"videoUrl": "https://www.youtube.com/watch?v=VIDEO_ID"}'
```

#### 3. Search Transcripts
```bash
curl "http://localhost:3000/api/search?q=your+search+terms"
```

#### 4. List All Transcripts
```bash
curl http://localhost:3000/api/transcripts
```

### Desktop App Features

- **Project Management**: Browse and manage your Claude Code projects
- **Agent Creation**: Build custom AI agents with specific prompts and behaviors
- **Usage Tracking**: Monitor API costs and usage patterns
- **Session Timeline**: Navigate through coding sessions with visual checkpoints

## 🛠️ Development

### Backend Development
```bash
# Start with hot reload
npm run dev

# Run specific tests
node test-transcript.js
node test-oauth.js
```

### Desktop App Development
```bash
cd claudia-vision-notebook

# Development mode
bun run tauri dev

# Build for production
bun run tauri build

# Frontend only
bun run dev

# Type checking
bunx tsc --noEmit
```

## 📁 Project Structure

```
/
├── src/                           # Node.js Express backend
│   ├── index.js                   # Main server file
│   └── services/                  # Business logic
│       ├── transcriptService.js   # Transcript fetching and storage
│       ├── authService.js         # OAuth2 authentication
│       ├── databaseService.js     # SQLite operations
│       └── pythonBridgeService.js # Python integration
├── claudia-vision-notebook/       # Tauri desktop application
│   ├── src/                       # React frontend
│   ├── src-tauri/                 # Rust backend
│   └── scripts/                   # Build utilities
├── scripts/                       # Python transcript fetchers
├── data/                          # Local database and tokens
└── test-*.js                      # Test suite
```

## 🔧 Configuration

### YouTube API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable YouTube Data API v3
4. Create OAuth2 credentials
5. Copy credentials to `credentials.json`

Example `credentials.json`:
```json
{
  "web": {
    "client_id": "your-client-id",
    "client_secret": "your-client-secret",
    "redirect_uris": ["http://localhost:3000/auth/callback"]
  }
}
```

### Environment Variables

Create a `.env` file for additional configuration:
```env
PORT=3000
DATABASE_PATH=./data/transcripts.db
OAUTH_TOKEN_PATH=./data/youtube-oauth-token.json
```

## 🧪 Testing

### Backend Tests
```bash
# Test basic transcript fetching
node test-transcript.js

# Test OAuth flow
node test-oauth.js

# Test database operations
node test-database.js

# Test Python bridge
node test-python-bridge.js
```

### Desktop App Tests
```bash
cd claudia-vision-notebook
cargo test --manifest-path src-tauri/Cargo.toml
```

## 📚 API Documentation

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/fetch-transcript` | Fetch and store transcript for a video |
| `GET` | `/api/transcripts` | List all stored transcripts |
| `GET` | `/api/transcripts/:id` | Get specific transcript |
| `DELETE` | `/api/transcripts/:id` | Delete transcript |
| `GET` | `/api/search?q=term` | Search transcripts |
| `GET` | `/auth` | Start OAuth2 flow |
| `GET` | `/auth/callback` | OAuth2 callback |
| `GET` | `/api/auth/status` | Check authentication status |

### Response Format

```json
{
  "success": true,
  "data": {
    "id": "video_id",
    "title": "Video Title",
    "transcript": "Full transcript text...",
    "metadata": {
      "duration": "10:30",
      "upload_date": "2024-01-01",
      "channel": "Channel Name"
    }
  }
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Commit with descriptive messages
5. Push to your fork and submit a pull request

## 🐛 Troubleshooting

### Common Issues

**OAuth2 Setup Error**
- Ensure `credentials.json` is properly configured
- Check that redirect URI matches exactly
- Verify YouTube Data API v3 is enabled

**Python Bridge Not Working**
- Activate the virtual environment: `source python_env/bin/activate`
- Install requirements: `pip install -r requirements.txt`
- Check Python path in bridge service

**Desktop App Build Fails**
- Ensure Rust is installed: `rustup update`
- Install platform dependencies (see Claudia README)
- Try: `cd claudia-vision-notebook && bun run build:executables:current`

## 📄 License

This project is open source. See individual component licenses for details.

## 🙏 Acknowledgments

- **YouTube Data API** for transcript access
- **Tauri** for the desktop application framework
- **Claude Code** for AI-assisted development
- **React** and **Vite** for the frontend
- **SQLite** for local data storage

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/tradesdontlie/youtube-transcript-app/issues)
- **Documentation**: See `CLAUDE.md` for development guidance
- **Setup Guides**: Check `OAUTH_SETUP.md` and `PYTHON_BRIDGE_README.md`

---

**Built with ❤️ and AI assistance from Claude Code**