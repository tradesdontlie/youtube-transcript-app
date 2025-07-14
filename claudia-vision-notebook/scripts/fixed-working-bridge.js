#!/usr/bin/env node

/**
 * Fixed working bridge script for VisionNotebook
 * This version properly handles the database path
 */

import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import services with correct paths
const { TranscriptService } = await import('../../src/services/transcriptService.js');

// Custom DatabaseService that uses the correct path
class DatabaseService {
  constructor() {
    // Use absolute path to the parent directory's data folder
    // __dirname is scripts/, we need to go up to claudia-vision-notebook, then up to youtube transcript app
    const dbPath = path.join(__dirname, '..', '..', 'data', 'transcripts.db');
    console.error(`Attempting to open database at: ${dbPath}`);
    
    this.db = new sqlite3.Database(dbPath);
    this.run = promisify(this.db.run.bind(this.db));
    this.get = promisify(this.db.get.bind(this.db));
    this.all = promisify(this.db.all.bind(this.db));
  }

  async initialize() {
    await this.run(`
      CREATE TABLE IF NOT EXISTS transcripts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        video_id TEXT UNIQUE NOT NULL,
        title TEXT,
        channel TEXT,
        duration INTEGER,
        transcript TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
}

// Initialize services
const dbService = new DatabaseService();
const transcriptService = new TranscriptService(dbService);

/**
 * Extract video ID from URL
 */
function extractVideoId(url) {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

/**
 * Fetch transcript for a video
 */
async function fetchTranscript(videoId) {
  try {
    const transcript = await transcriptService.fetchTranscriptWithFallbacks(videoId);
    if (!transcript || transcript.length === 0) {
      throw new Error('No transcript available');
    }
    
    // Get video info
    const videoInfo = await transcriptService.getVideoInfo(videoId);
    
    return {
      success: true,
      video_info: {
        video_id: videoId,
        title: videoInfo.title,
        channel: videoInfo.channel,
        duration: videoInfo.duration
      },
      transcript: transcript.map(segment => ({
        text: segment.text,
        start: segment.start,
        duration: segment.duration
      }))
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Main execution
const args = process.argv.slice(2);
const command = args[0];

try {
  switch (command) {
    case 'fetch': {
      const videoId = args[1];
      if (!videoId) {
        console.error('Usage: working-bridge.js fetch <video_id>');
        process.exit(1);
      }
      const result = await fetchTranscript(videoId);
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    
    case 'extract-id': {
      const url = args[1];
      if (!url) {
        console.error('Usage: working-bridge.js extract-id <youtube_url>');
        process.exit(1);
      }
      const videoId = extractVideoId(url);
      if (videoId) {
        console.log(JSON.stringify({ success: true, video_id: videoId }));
      } else {
        console.log(JSON.stringify({ success: false, error: 'Invalid YouTube URL' }));
      }
      break;
    }
    
    case 'health': {
      const health = await transcriptService.healthCheck();
      console.log(JSON.stringify({ success: true, health }, null, 2));
      break;
    }
    
    default:
      console.error(`
Usage: working-bridge.js <command> [args]

Commands:
  fetch <video_id>          Fetch transcript for video ID
  extract-id <youtube_url>  Extract video ID from YouTube URL
  health                    Check service health
`);
      process.exit(1);
  }
} catch (error) {
  console.error(JSON.stringify({
    success: false,
    error: error.message
  }));
  process.exit(1);
}