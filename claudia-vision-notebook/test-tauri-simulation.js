#!/usr/bin/env node

/**
 * Simulate the exact command that Tauri runs to debug why it might fail
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test video URL 
const TEST_VIDEO_ID = 'dQw4w9WgXcQ';

console.log('🔍 Simulating exact Tauri command execution...\n');

// This simulates exactly what the Rust code does in call_transcript_service
async function simulateTauriCall() {
  return new Promise((resolve, reject) => {
    // Get current working directory (this is what Tauri does)
    const cwd = process.cwd();
    console.log('Current working directory:', cwd);
    
    // Construct the bridge script path (exactly like Rust code)
    const bridgeScript = path.join(cwd, 'scripts', 'clean-bridge.js');
    console.log('Bridge script path:', bridgeScript);
    
    // Check if bridge script exists
    import('fs').then(fs => {
      if (fs.existsSync(bridgeScript)) {
        console.log('✅ Bridge script exists');
      } else {
        console.log('❌ Bridge script NOT found!');
        return resolve({ error: 'Bridge script not found' });
      }
      
      console.log('\n🚀 Executing command:');
      console.log(`node ${bridgeScript} fetch ${TEST_VIDEO_ID}`);
      console.log();
      
      // Execute exactly like Tauri does
      const child = spawn('node', [bridgeScript, 'fetch', TEST_VIDEO_ID], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: cwd
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
        console.log(`Process exited with code: ${code}`);
        
        if (code === 0) {
          console.log('\n📤 Raw stdout length:', stdout.length);
          console.log('📤 Raw stderr length:', stderr.length);
          
          try {
            const result = JSON.parse(stdout);
            console.log('\n✅ JSON Parse Success!');
            console.log('Result keys:', Object.keys(result));
            console.log('Success flag:', result.success);
            
            if (result.success) {
              console.log('Video title:', result.video_info?.title);
              console.log('Transcript segments:', result.transcript?.length);
              
              resolve({
                success: true,
                result: result,
                stderr_debug: stderr
              });
            } else {
              console.log('❌ Service returned error:', result.error);
              resolve({
                success: false,
                error: result.error,
                stderr_debug: stderr
              });
            }
            
          } catch (parseError) {
            console.log('\n❌ JSON Parse Failed!');
            console.log('Parse error:', parseError.message);
            console.log('Stdout content preview:', stdout.substring(0, 500));
            
            resolve({
              success: false,
              error: `JSON parse failed: ${parseError.message}`,
              raw_stdout: stdout,
              stderr_debug: stderr
            });
          }
        } else {
          console.log('\n❌ Process failed with non-zero exit code');
          console.log('Stderr:', stderr);
          
          resolve({
            success: false,
            error: `Process exited with code ${code}`,
            stderr_debug: stderr
          });
        }
      });
      
      child.on('error', (error) => {
        console.log('\n❌ Process spawn error:', error.message);
        resolve({
          success: false,
          error: error.message
        });
      });
    });
  });
}

// Run the simulation from claudia-vision-notebook directory
process.chdir(path.join(__dirname));
console.log('Testing from directory:', process.cwd());

simulateTauriCall().then(result => {
  console.log('\n🏁 Simulation Result:');
  console.log('Success:', result.success);
  
  if (result.success) {
    console.log('✅ The Tauri command simulation worked perfectly!');
    console.log('   This means the issue is likely in:');
    console.log('   - Tauri environment setup');
    console.log('   - Database connection');
    console.log('   - Frontend error handling');
    console.log('   - CORS or security policies');
  } else {
    console.log('❌ Simulation failed with error:', result.error);
    console.log('   This helps identify the exact issue');
  }
  
  console.log('\n🔧 Next steps:');
  console.log('1. Check Tauri dev tools/console for JavaScript errors');
  console.log('2. Verify the Tauri command registration');
  console.log('3. Test with a simple Tauri command first');
  console.log('4. Check database initialization in Tauri');
}).catch(error => {
  console.log('\n💥 Simulation crashed:', error.message);
});