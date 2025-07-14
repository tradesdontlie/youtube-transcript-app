import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PythonBridgeService {
  constructor() {
    this.pythonPath = path.join(__dirname, '../../venv/bin/python');
    this.scriptPath = path.join(__dirname, '../../scripts/transcript_fetcher.py');
    this.timeout = 30000; // 30 seconds
  }

  async fetchTranscript(videoId) {
    return new Promise((resolve, reject) => {
      console.log(`🐍 Python Bridge: Fetching transcript for ${videoId}`);
      
      const process = spawn(this.pythonPath, [this.scriptPath, videoId], {
        cwd: path.join(__dirname, '../..'),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      // Set up timeout
      const timer = setTimeout(() => {
        process.kill('SIGTERM');
        reject(new Error('Python script timeout'));
      }, this.timeout);

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        clearTimeout(timer);
        
        if (code !== 0) {
          console.log(`🐍 Python Bridge: Process exited with code ${code}`);
          console.log(`🐍 Python Bridge: Stderr: ${stderr}`);
          reject(new Error(`Python script failed with code ${code}: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout);
          
          if (result.success) {
            console.log(`🐍 Python Bridge: Successfully fetched ${result.transcript.length} segments`);
            
            // Convert to our expected format
            const segments = result.transcript.map(item => ({
              text: item.text.replace(/\n/g, ' ').trim(),
              start: item.start,
              duration: item.duration
            })).filter(item => item.text.length > 0);

            resolve(segments);
          } else {
            console.log(`🐍 Python Bridge: Failed - ${result.error}`);
            reject(new Error(result.error));
          }
        } catch (parseError) {
          console.log(`🐍 Python Bridge: JSON parse error:`, parseError.message);
          console.log(`🐍 Python Bridge: Raw output:`, stdout);
          reject(new Error(`Failed to parse Python script output: ${parseError.message}`));
        }
      });

      process.on('error', (error) => {
        clearTimeout(timer);
        console.log(`🐍 Python Bridge: Process error:`, error.message);
        reject(new Error(`Failed to spawn Python process: ${error.message}`));
      });
    });
  }

  async healthCheck() {
    try {
      // Test with a known working video
      const result = await this.fetchTranscript('dQw4w9WgXcQ');
      return {
        healthy: true,
        segmentCount: result.length,
        message: 'Python bridge working correctly'
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        message: 'Python bridge health check failed'
      };
    }
  }
}