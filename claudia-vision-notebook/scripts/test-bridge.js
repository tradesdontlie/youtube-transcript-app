#!/usr/bin/env node

/**
 * Simple test for transcript bridge functionality
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Starting transcript bridge test...');
console.log('Current directory:', process.cwd());
console.log('Script directory:', __dirname);

// Test video ID extraction
function extractVideoId(url) {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

const testUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const videoId = extractVideoId(testUrl);
console.log('Test URL:', testUrl);
console.log('Extracted Video ID:', videoId);

// Test transcript service import
try {
  console.log('Testing service imports...');
  const { TranscriptService } = await import('../../src/services/transcriptService.js');
  const { DatabaseService } = await import('../../src/services/databaseService.js');
  
  console.log('Services imported successfully');
  
  const dbService = new DatabaseService();
  const transcriptService = new TranscriptService(dbService);
  
  console.log('Services initialized successfully');
  
  // Test health check
  console.log('Running health check...');
  const health = await transcriptService.healthCheck();
  console.log('Health check result:', JSON.stringify(health, null, 2));
  
} catch (error) {
  console.error('Error importing or using services:', error.message);
  console.error('Stack:', error.stack);
}

console.log('Test completed.');