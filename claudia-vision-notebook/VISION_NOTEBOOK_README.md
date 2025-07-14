# VisionNotebook - YouTube Analysis & Claude Integration

VisionNotebook is an enhanced version of Claudia that integrates YouTube transcript analysis with Claude CLI for intelligent video processing, quiz generation, and multimodal analysis.

## Features

- **YouTube Video Processing**: Download and extract transcripts from any public YouTube video
- **Claude CLI Integration**: Use Claude for intelligent analysis, summarization, and quiz generation
- **Manifest System**: Organize video content with timestamps for transcripts and frames
- **Interactive Chat**: Ask questions about video content using Claude
- **Quiz Generation**: Automatically generate multiple-choice questions from video content
- **Multi-format Summaries**: Generate brief, detailed, or bullet-point summaries
- **Frame Extraction**: Sample video frames at configurable fps for visual analysis

## Prerequisites

### Required Software
- **Node.js** (v18+): For the existing transcript service
- **Rust & Cargo**: For building the Tauri application  
- **Claude CLI**: For AI-powered analysis (install from [Anthropic](https://docs.anthropic.com/en/docs/claude-code))

### Optional (for advanced features)
- **yt-dlp**: For downloading YouTube videos
- **ffmpeg**: For frame extraction

## Installation

### 1. Install Prerequisites

```bash
# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Node.js dependencies for transcript service
npm install

# Install Claude CLI (follow official docs)
# https://docs.anthropic.com/en/docs/claude-code
```

### 2. Install Optional Tools

```bash
# Install yt-dlp for video downloading
pip install yt-dlp

# Install ffmpeg (macOS with Homebrew)
brew install ffmpeg

# Or install ffmpeg (Ubuntu/Debian)
sudo apt install ffmpeg
```

### 3. Setup Database

The transcript service requires a SQLite database. Make sure the existing transcript service is working:

```bash
# Test the existing transcript service
node src/index.js
```

## Development

### Frontend Development

```bash
# Install frontend dependencies
npm install

# Start development server (Vite)
npm run dev
```

### Tauri Development

```bash
# Build Tauri backend and start app
npm run tauri dev
```

### Test Components Separately

```bash
# Test transcript bridge
node scripts/transcript-bridge.js health

# Test video ID extraction
node scripts/transcript-bridge.js extract-id "https://youtube.com/watch?v=dQw4w9WgXcQ"

# Test transcript fetching
node scripts/transcript-bridge.js fetch dQw4w9WgXcQ
```

## Usage

### 1. Launch VisionNotebook

From the Claudia welcome screen, click on **VisionNotebook** to enter the YouTube analysis workspace.

### 2. Process a Video

1. Enter a YouTube URL in the input field
2. Optionally enable frame extraction and set FPS
3. Click **Process Video**
4. Wait for transcript extraction and processing

### 3. Analyze Content

- **Chat Tab**: Ask questions about the video content
- **Quiz Tab**: Generate and answer multiple-choice questions  
- **Summary Tab**: Create different types of summaries
- **Transcript Tab**: Browse timestamped transcript segments
- **Frames Tab**: View extracted video frames (if enabled)

## Architecture

### Components

```
┌─────────────────┐   Tauri IPC   ┌─────────────────┐
│   React UI      │──────────────│   Rust Backend  │
│  (TypeScript)   │              │   (Tauri)       │
└─────────────────┘              └─────────────────┘
         │                                │
         │                                │ spawn
         │                                ▼
         │                       ┌─────────────────┐
         │                       │  Node.js Bridge │
         │                       │   (transcript)  │
         │                       └─────────────────┘
         │                                │
         │                                │ calls
         │                                ▼
         └─────────────────────────┬──────────────────┐
                                   │                  │
                            ┌─────────────────┐ ┌─────────────────┐
                            │  Claude CLI     │ │ YouTube APIs    │
                            │   (Analysis)    │ │  (Transcripts)  │
                            └─────────────────┘ └─────────────────┘
```

### Data Flow

1. **Input**: YouTube URL from React UI
2. **Processing**: Tauri backend extracts video ID, calls Node.js bridge
3. **Transcript**: Bridge script uses existing service to fetch transcript
4. **Manifest**: Combine transcript + frames into timestamped manifest
5. **Analysis**: Use Claude CLI for questions, quizzes, summaries
6. **Output**: Display results in React UI tabs

## File Structure

```
claudia-vision-notebook/
├── src/                          # React frontend
│   ├── components/
│   │   └── VisionNotebook.tsx    # Main UI component
│   └── App.tsx                   # Updated app with VisionNotebook
├── src-tauri/                    # Rust backend
│   └── src/commands/
│       └── vision_notebook.rs    # Tauri commands
├── scripts/
│   └── transcript-bridge.js      # Node.js bridge script
└── ...                          # Standard Claudia files
```

## Troubleshooting

### Common Issues

1. **Transcript Service Fails**
   - Ensure the parent directory contains the working transcript service
   - Check database permissions in `../data/transcripts.db`
   - Verify Node.js dependencies are installed

2. **Claude CLI Not Found**
   - Install Claude CLI following official documentation
   - Ensure `claude` command is in your PATH
   - Test with `claude --version`

3. **Video Download Fails**
   - Install yt-dlp: `pip install yt-dlp`
   - Check internet connection and YouTube availability
   - Some videos may be geo-restricted or private

4. **Frame Extraction Fails**
   - Install ffmpeg: `brew install ffmpeg` (macOS)
   - Ensure video was downloaded successfully first
   - Check disk space for frame storage

### Debug Commands

```bash
# Check transcript service health
node scripts/transcript-bridge.js health

# Test Claude CLI integration
claude -p "Hello, Claude!"

# Check Tauri backend (requires Rust)
cd src-tauri && cargo check

# Test frontend compilation
npm run build
```

## Contributing

This is a fork of [Claudia](https://github.com/getAsterisk/claudia) with VisionNotebook extensions. To contribute:

1. Fork this repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project maintains the same license as the original Claudia project (AGPL-3.0).

## Credits

- **Claudia**: Original GUI framework by getAsterisk
- **YouTube Transcript API**: For transcript extraction
- **Claude CLI**: AI analysis by Anthropic
- **Tauri**: Cross-platform desktop framework