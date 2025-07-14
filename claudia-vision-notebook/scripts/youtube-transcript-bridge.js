#!/usr/bin/env node

/**
 * YouTube Transcript Bridge
 * Interfaces with the parent YouTube transcript app to fetch transcripts
 */

const { spawn } = require('child_process');
const path = require('path');

// Get command from arguments
const command = process.argv[2];
const videoId = process.argv[3];

if (!command) {
  console.error(JSON.stringify({
    success: false,
    error: 'No command specified'
  }));
  process.exit(1);
}

// Path to the parent app's working bridge
const parentDir = path.resolve(__dirname, '../../..');
const bridgeScript = path.join(parentDir, 'claudia-vision-notebook/scripts/working-bridge.js');

function executeCommand(cmd, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [bridgeScript, cmd, ...args], {
      cwd: parentDir,
      env: { ...process.env, NODE_ENV: 'production' }
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Process exited with code ${code}`));
      } else {
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${stdout}`));
        }
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  try {
    let result;

    switch (command) {
      case 'fetch':
        if (!videoId) {
          throw new Error('Video ID required for fetch command');
        }
        result = await executeCommand('fetch', [videoId]);
        break;

      case 'search':
        const query = videoId; // Reuse videoId parameter for query
        if (!query) {
          throw new Error('Query required for search command');
        }
        result = await executeCommand('search', [query]);
        break;

      case 'list':
        result = await executeCommand('list');
        break;

      default:
        throw new Error(`Unknown command: ${command}`);
    }

    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(JSON.stringify({
      success: false,
      error: error.message
    }));
    process.exit(1);
  }
}

main();