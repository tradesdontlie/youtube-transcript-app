#!/usr/bin/env node

/**
 * Test script for YouTube transcript functionality
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test video URL (Rick Astley - Never Gonna Give You Up)
const TEST_VIDEO_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const TEST_VIDEO_ID = 'dQw4w9WgXcQ';

console.log('🧪 Testing YouTube Transcript Functionality\n');

// Test 1: Extract video ID from URL
console.log('Test 1: Extracting video ID from URL...');
const extractProcess = spawn('node', [
  path.join(__dirname, 'scripts', 'working-bridge.js'),
  'extract-id',
  TEST_VIDEO_URL
]);

let extractOutput = '';
extractProcess.stdout.on('data', (data) => {
  extractOutput += data.toString();
});

extractProcess.on('close', (code) => {
  if (code === 0) {
    try {
      const result = JSON.parse(extractOutput);
      if (result.success && result.video_id === TEST_VIDEO_ID) {
        console.log('✅ Video ID extraction successful:', result.video_id);
      } else {
        console.log('❌ Video ID extraction failed:', result);
      }
    } catch (e) {
      console.log('❌ Failed to parse extraction result:', e.message);
    }
  } else {
    console.log('❌ Extract process failed with code:', code);
  }

  // Test 2: Check service health
  console.log('\nTest 2: Checking service health...');
  const healthProcess = spawn('node', [
    path.join(__dirname, 'scripts', 'working-bridge.js'),
    'health'
  ]);

  let healthOutput = '';
  healthProcess.stdout.on('data', (data) => {
    healthOutput += data.toString();
  });

  healthProcess.on('close', (code) => {
    if (code === 0) {
      try {
        const result = JSON.parse(healthOutput);
        console.log('✅ Service health check:', result.health ? 'Healthy' : 'Unhealthy');
      } catch (e) {
        console.log('❌ Failed to parse health result:', e.message);
      }
    } else {
      console.log('❌ Health check process failed with code:', code);
    }

    // Test 3: Fetch transcript
    console.log('\nTest 3: Fetching transcript for video...');
    console.log('Video:', TEST_VIDEO_URL);
    const fetchProcess = spawn('node', [
      path.join(__dirname, 'scripts', 'working-bridge.js'),
      'fetch',
      TEST_VIDEO_ID
    ]);

    let fetchOutput = '';
    fetchProcess.stdout.on('data', (data) => {
      fetchOutput += data.toString();
    });

    fetchProcess.stderr.on('data', (data) => {
      console.error('Fetch error:', data.toString());
    });

    fetchProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(fetchOutput);
          if (result.success) {
            console.log('✅ Transcript fetch successful!');
            console.log('   Video Title:', result.video_info.title);
            console.log('   Channel:', result.video_info.channel);
            console.log('   Duration:', result.video_info.duration);
            console.log('   Transcript segments:', result.transcript ? result.transcript.length : 0);
            
            if (result.transcript && result.transcript.length > 0) {
              console.log('\n   First few transcript segments:');
              result.transcript.slice(0, 3).forEach((segment, i) => {
                console.log(`   ${i + 1}. [${formatTime(segment.start)}] ${segment.text}`);
              });
            }
          } else {
            console.log('❌ Transcript fetch failed:', result.error);
          }
        } catch (e) {
          console.log('❌ Failed to parse fetch result:', e.message);
          console.log('Raw output:', fetchOutput);
        }
      } else {
        console.log('❌ Fetch process failed with code:', code);
      }
      
      console.log('\n🏁 Testing complete!');
    });
  });
});

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}