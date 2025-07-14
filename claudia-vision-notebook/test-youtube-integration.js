#!/usr/bin/env node

/**
 * YouTube Transcript Integration Test
 * This script tests the YouTube transcript functionality in Claudia Vision Notebook
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test video URL (Rick Astley - Never Gonna Give You Up)
const TEST_VIDEO_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

console.log('=== YouTube Transcript Integration Test ===\n');

// Test 1: Extract video ID from URL
console.log('Test 1: Extracting video ID from URL...');
const extractIdProcess = spawn('node', [
  path.join(__dirname, 'scripts', 'working-bridge.js'),
  'extract-id',
  TEST_VIDEO_URL
]);

extractIdProcess.stdout.on('data', (data) => {
  const result = JSON.parse(data.toString());
  if (result.success) {
    console.log('✓ Video ID extracted successfully:', result.video_id);
    
    // Test 2: Fetch transcript
    console.log('\nTest 2: Fetching transcript...');
    const fetchProcess = spawn('node', [
      path.join(__dirname, 'scripts', 'working-bridge.js'),
      'fetch',
      result.video_id
    ]);
    
    fetchProcess.stdout.on('data', (fetchData) => {
      try {
        const transcriptResult = JSON.parse(fetchData.toString());
        if (transcriptResult.success) {
          console.log('✓ Transcript fetched successfully!');
          console.log('\nVideo Info:');
          console.log('- Title:', transcriptResult.video_info.title);
          console.log('- Channel:', transcriptResult.video_info.channel);
          console.log('- Duration:', transcriptResult.video_info.duration);
          console.log('- Transcript segments:', transcriptResult.transcript.length);
          
          if (transcriptResult.transcript.length > 0) {
            console.log('\nFirst 3 transcript segments:');
            transcriptResult.transcript.slice(0, 3).forEach((segment, index) => {
              console.log(`\n${index + 1}. [${formatTime(segment.start)}]`);
              console.log(`   "${segment.text}"`);
              console.log(`   Duration: ${segment.duration}s`);
            });
          }
          
          console.log('\n✓ All tests passed! YouTube transcript integration is working.');
        } else {
          console.error('✗ Failed to fetch transcript:', transcriptResult.error);
        }
      } catch (error) {
        console.error('✗ Error parsing transcript result:', error.message);
      }
    });
    
    fetchProcess.stderr.on('data', (data) => {
      console.error('✗ Transcript fetch error:', data.toString());
    });
    
  } else {
    console.error('✗ Failed to extract video ID:', result.error);
  }
});

extractIdProcess.stderr.on('data', (data) => {
  console.error('✗ Extract ID error:', data.toString());
});

// Test 3: Check service health
console.log('\nTest 3: Checking service health...');
const healthProcess = spawn('node', [
  path.join(__dirname, 'scripts', 'working-bridge.js'),
  'health'
]);

healthProcess.stdout.on('data', (data) => {
  try {
    const healthResult = JSON.parse(data.toString());
    if (healthResult.success) {
      console.log('✓ Service health check passed');
      console.log('  Health data:', JSON.stringify(healthResult.health, null, 2));
    }
  } catch (error) {
    console.error('✗ Error parsing health result:', error.message);
  }
});

healthProcess.stderr.on('data', (data) => {
  console.error('✗ Health check error:', data.toString());
});

// Helper function to format time
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Exit handler
process.on('exit', (code) => {
  if (code === 0) {
    console.log('\n=== Test completed successfully ===');
  } else {
    console.log('\n=== Test failed ===');
  }
});