#!/usr/bin/env node

/**
 * Bridge script to connect existing YouTube transcript service with VisionNotebook
 * This script provides a CLI interface to the existing transcript functionality
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import from parent directory
const { TranscriptService } = await import('../../src/services/transcriptService.js');
const { DatabaseService } = await import('../../src/services/databaseService.js');

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

/**
 * Save transcript to database
 */
async function saveTranscript(videoUrl) {
  try {
    const result = await transcriptService.fetchAndStore(videoUrl);
    return {
      success: true,
      result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get available transcripts for a video
 */
async function getAvailableTranscripts(videoId) {
  try {
    const transcripts = await transcriptService.getAvailableTranscripts(videoId);
    return {
      success: true,
      transcripts
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Health check
 */
async function healthCheck() {
  try {
    const health = await transcriptService.healthCheck();
    return {
      success: true,
      health
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Main CLI handler
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command) {
    console.error(`
Usage: transcript-bridge.js <command> [args]

Commands:
  fetch <video_id>          Fetch transcript for video ID
  extract-id <youtube_url>  Extract video ID from YouTube URL
  save <youtube_url>        Save transcript to database
  available <video_id>      Get available transcript languages
  health                    Check service health
`);
    process.exit(1);
  }
  
  try {
    switch (command) {
      case 'fetch': {
        const videoId = args[1];
        if (!videoId) {
          console.error('Usage: transcript-bridge.js fetch <video_id>');
          process.exit(1);
        }
        const result = await fetchTranscript(videoId);
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      
      case 'extract-id': {
        const url = args[1];
        if (!url) {
          console.error('Usage: transcript-bridge.js extract-id <youtube_url>');
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
      
      case 'save': {
        const url = args[1];
        if (!url) {
          console.error('Usage: transcript-bridge.js save <youtube_url>');
          process.exit(1);
        }
        const result = await saveTranscript(url);
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      
      case 'available': {
        const videoId = args[1];
        if (!videoId) {
          console.error('Usage: transcript-bridge.js available <video_id>');
          process.exit(1);
        }
        const result = await getAvailableTranscripts(videoId);
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      
      case 'health': {
        const result = await healthCheck();
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      
      default:
        console.error(`
Usage: transcript-bridge.js <command> [args]

Commands:
  fetch <video_id>          Fetch transcript for video ID
  extract-id <youtube_url>  Extract video ID from YouTube URL
  save <youtube_url>        Save transcript to database
  available <video_id>      Get available transcript languages
  health                    Check service health

Examples:
  transcript-bridge.js fetch dQw4w9WgXcQ
  transcript-bridge.js extract-id "https://youtube.com/watch?v=dQw4w9WgXcQ"
  transcript-bridge.js save "https://youtube.com/watch?v=dQw4w9WgXcQ"
  transcript-bridge.js health
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
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}

export { fetchTranscript, extractVideoId, saveTranscript, getAvailableTranscripts, healthCheck };