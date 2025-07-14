#!/usr/bin/env node

/**
 * Test script to directly test the clean bridge script that Tauri calls
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test video URL
const TEST_VIDEO_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const TEST_VIDEO_ID = 'dQw4w9WgXcQ';

console.log('🧪 Testing clean bridge script (used by Tauri)\n');

// Change to parent directory to ensure correct node_modules access
process.chdir(path.join(__dirname, '..'));

console.log('Working directory:', process.cwd());
console.log('Test video ID:', TEST_VIDEO_ID);

// Test: Fetch transcript using clean bridge
console.log('\nTesting: Fetching transcript using clean bridge...');
const fetchProcess = spawn('node', [
  path.join(__dirname, 'scripts', 'clean-bridge.js'),
  'fetch',
  TEST_VIDEO_ID
], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let fetchOutput = '';
let fetchErrors = '';

fetchProcess.stdout.on('data', (data) => {
  fetchOutput += data.toString();
});

fetchProcess.stderr.on('data', (data) => {
  fetchErrors += data.toString();
});

fetchProcess.on('close', (code) => {
  console.log(`\nProcess exited with code: ${code}`);
  
  if (fetchErrors) {
    console.log('\nSTDERR (debug info):');
    console.log('---');
    console.log(fetchErrors);
    console.log('---');
  }
  
  console.log('\nSTDOUT (JSON response):');
  console.log('---');
  console.log(fetchOutput);
  console.log('---');
  
  if (code === 0 && fetchOutput.trim()) {
    try {
      const result = JSON.parse(fetchOutput.trim());
      if (result.success) {
        console.log('\n✅ SUCCESS!');
        console.log('Video title:', result.video_info.title);
        console.log('Channel:', result.video_info.channel);
        console.log('Transcript segments:', result.transcript ? result.transcript.length : 0);
        
        if (result.transcript && result.transcript.length > 0) {
          console.log('\nFirst transcript segment:');
          console.log(`"${result.transcript[0].text}" (start: ${result.transcript[0].start}s)`);
        }
        
        console.log('\n🎯 The bridge script is working correctly!');
        console.log('   The issue must be elsewhere in the Tauri application.');
      } else {
        console.log('\n❌ FAILED!');
        console.log('Error:', result.error);
      }
    } catch (e) {
      console.log('\n❌ JSON PARSE ERROR!');
      console.log('Failed to parse JSON response:', e.message);
      console.log('Raw output length:', fetchOutput.length);
    }
  } else {
    console.log('\n❌ PROCESS FAILED!');
    console.log('Exit code:', code);
  }
  
  console.log('\n🏁 Test complete!');
});