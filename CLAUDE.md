# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Architecture

This repository contains two main applications:

### 1. YouTube Transcript App (Root Level)
- **Backend**: Node.js Express server with SQLite database
- **Language**: JavaScript (ES modules)
- **Main Entry**: `src/index.js`
- **Services**: Modular architecture with separate services for transcripts, database, and OAuth authentication
- **API**: RESTful endpoints for transcript management and YouTube OAuth2 authentication

### 2. Claudia Vision Notebook (claudia-vision-notebook/)
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Rust with Tauri 2 framework
- **UI**: Tailwind CSS v4 + shadcn/ui components
- **Desktop App**: Cross-platform GUI for Claude Code management
- **Database**: SQLite for local data storage

## Development Commands

### YouTube Transcript App (Root)
```bash
# Start development server
npm run dev

# Start production server
npm start

# Install dependencies
npm install

# Python environment setup
python -m venv python_env
source python_env/bin/activate  # On Windows: python_env\Scripts\activate
pip install -r requirements.txt
```

### Claudia Vision Notebook
```bash
# Install dependencies
bun install

# Development with hot reload
bun run tauri dev

# Build for production
bun run tauri build

# Frontend only development
bun run dev

# Type checking
bunx tsc --noEmit

# Build executables for current platform
bun run build:executables:current
```

## Key Technical Details

### YouTube Transcript App
- **Database**: SQLite with transcript storage and search capabilities
- **Authentication**: OAuth2 flow for YouTube API access
- **Transcript Fetching**: Multiple fallback methods including youtube-transcript library and Python bridge
- **Port**: Runs on localhost:3000
- **Data Storage**: `data/transcripts.db` and `data/youtube-oauth-token.json`

### Claudia Application
- **Process Management**: Handles Claude Code CLI processes and session management
- **Checkpoints**: Timeline-based session versioning and restore functionality
- **Agents**: Custom AI agent creation and execution
- **MCP Integration**: Model Context Protocol server management
- **Usage Analytics**: Cost and token tracking for Claude API usage

## File Structure Highlights

```
/
├── src/                           # Node.js app source
│   ├── index.js                   # Express server entry point
│   └── services/                  # Business logic modules
├── claudia-vision-notebook/       # Tauri desktop application
│   ├── src/                       # React frontend
│   ├── src-tauri/                 # Rust backend
│   └── scripts/                   # Build and utility scripts
├── scripts/                       # Python transcript fetchers
├── data/                          # Local data storage
└── python_env/                    # Python virtual environment
```

## Authentication Setup

YouTube API requires OAuth2 credentials in `credentials.json`. See `OAUTH_SETUP.md` for configuration instructions.

## Testing

The repository includes comprehensive test files for transcript fetching, database operations, and API endpoints. Test files are prefixed with `test-` or `test_`.