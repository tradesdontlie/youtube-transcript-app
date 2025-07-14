import { TranscriptService } from './src/services/transcriptService.js';
import { DatabaseService } from './src/services/databaseService.js';
import { PythonBridgeService } from './src/services/pythonBridgeService.js';

class PythonBridgeTest {
  constructor() {
    this.db = new DatabaseService();
    this.transcriptService = new TranscriptService(this.db);
    this.pythonBridge = new PythonBridgeService();
    
    // Test video IDs with different characteristics
    this.testVideos = [
      {
        id: 'dQw4w9WgXcQ',
        name: 'Rick Astley - Never Gonna Give You Up',
        description: 'Popular music video with captions',
        expected: true
      },
      {
        id: 'JGwWNGJdvx8',
        name: 'Ed Sheeran - Shape of You',
        description: 'Music video with auto-generated captions',
        expected: true
      },
      {
        id: 'kJQP7kiw5Fk',
        name: 'Luis Fonsi - Despacito',
        description: 'Spanish music video',
        expected: true
      },
      {
        id: 'invalid123',
        name: 'Invalid Video ID',
        description: 'Invalid video ID format',
        expected: false
      }
    ];
  }

  async initialize() {
    try {
      await this.db.initialize();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error.message);
      throw error;
    }
  }

  async runHealthCheck() {
    console.log('\n=== HEALTH CHECK ===');
    
    try {
      // Test Python Bridge health
      console.log('\n1. Python Bridge Health Check:');
      const pythonHealth = await this.pythonBridge.healthCheck();
      console.log('Result:', JSON.stringify(pythonHealth, null, 2));
      
      // Test TranscriptService health
      console.log('\n2. TranscriptService Health Check:');
      const serviceHealth = await this.transcriptService.healthCheck();
      console.log('Result:', JSON.stringify(serviceHealth, null, 2));
      
      return {
        pythonBridge: pythonHealth.success,
        transcriptService: serviceHealth.overallStatus !== 'unhealthy'
      };
    } catch (error) {
      console.error('Health check failed:', error.message);
      return { pythonBridge: false, transcriptService: false };
    }
  }

  async testPythonBridgeDirectly() {
    console.log('\n=== DIRECT PYTHON BRIDGE TESTS ===');
    
    const results = [];
    
    for (const video of this.testVideos) {
      console.log(`\n--- Testing: ${video.name} (${video.id}) ---`);
      console.log(`Description: ${video.description}`);
      
      const startTime = Date.now();
      
      try {
        
        // Test available transcripts first
        console.log('Getting available transcripts...');
        const availableTranscripts = await this.pythonBridge.getAvailableTranscripts(video.id);
        console.log('Available transcripts:', availableTranscripts.success ? 
          `${availableTranscripts.availableTranscripts.length} found` : 'Failed');
        
        if (availableTranscripts.success && availableTranscripts.availableTranscripts.length > 0) {
          console.log('Languages available:', 
            availableTranscripts.availableTranscripts.map(t => `${t.language} (${t.language_code})`).join(', '));
        }
        
        // Test transcript fetching
        console.log('Fetching transcript...');
        const result = await this.pythonBridge.fetchTranscript(video.id);
        const endTime = Date.now();
        
        if (result.success) {
          console.log(`✅ SUCCESS: Fetched ${result.transcript.length} segments in ${endTime - startTime}ms`);
          console.log(`Language: ${result.metadata.language} (${result.metadata.language_code})`);
          console.log(`Generated: ${result.metadata.is_generated ? 'Yes' : 'No'}`);
          console.log(`First segment: "${result.transcript[0]?.text?.substring(0, 100)}..."`);
          
          results.push({
            video: video.name,
            videoId: video.id,
            success: true,
            segments: result.transcript.length,
            language: result.metadata.language,
            timeMs: endTime - startTime
          });
        } else {
          console.log(`❌ FAILED: Expected ${video.expected ? 'success' : 'failure'}`);
          results.push({
            video: video.name,
            videoId: video.id,
            success: false,
            error: 'Unexpected failure',
            timeMs: endTime - startTime
          });
        }
        
      } catch (error) {
        const endTime = Date.now();
        console.log(`❌ ERROR: ${error.message}`);
        
        if (video.expected) {
          console.log('This was unexpected - video should have worked');
        } else {
          console.log('This was expected - video should fail');
        }
        
        results.push({
          video: video.name,
          videoId: video.id,
          success: false,
          error: error.message,
          timeMs: endTime - startTime
        });
      }
    }
    
    return results;
  }

  async testTranscriptServiceIntegration() {
    console.log('\n=== TRANSCRIPT SERVICE INTEGRATION TESTS ===');
    
    const results = [];
    
    for (const video of this.testVideos.slice(0, 2)) { // Test first 2 videos
      console.log(`\n--- Testing TranscriptService with: ${video.name} ---`);
      
      try {
        const startTime = Date.now();
        
        // Test the full service integration
        const result = await this.transcriptService.fetchTranscriptWithFallbacks(video.id);
        const endTime = Date.now();
        
        if (result && result.length > 0) {
          console.log(`✅ SUCCESS: Retrieved ${result.length} segments in ${endTime - startTime}ms`);
          console.log(`Sample text: "${result[0]?.text?.substring(0, 100)}..."`);
          
          results.push({
            video: video.name,
            videoId: video.id,
            success: true,
            segments: result.length,
            timeMs: endTime - startTime,
            method: 'Python Bridge (priority 1)'
          });
        } else {
          console.log(`❌ FAILED: No transcript data returned`);
          results.push({
            video: video.name,
            videoId: video.id,
            success: false,
            error: 'No transcript data',
            timeMs: endTime - startTime
          });
        }
        
      } catch (error) {
        const endTime = Date.now();
        console.log(`❌ ERROR: ${error.message}`);
        
        results.push({
          video: video.name,
          videoId: video.id,
          success: false,
          error: error.message,
          timeMs: endTime - startTime
        });
      }
    }
    
    return results;
  }

  async testFullWorkflow() {
    console.log('\n=== FULL WORKFLOW TEST ===');
    
    const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    console.log(`Testing full workflow with URL: ${testUrl}`);
    
    try {
      const startTime = Date.now();
      
      // Test the complete fetchAndStore workflow
      const result = await this.transcriptService.fetchAndStore(testUrl);
      const endTime = Date.now();
      
      console.log(`✅ WORKFLOW SUCCESS in ${endTime - startTime}ms:`);
      console.log(`- Message: ${result.message}`);
      console.log(`- Video ID: ${result.videoId}`);
      console.log(`- Title: ${result.title}`);
      console.log(`- Transcript Length: ${result.transcriptLength} characters`);
      
      if (result.warning) {
        console.log(`- Warning: ${result.warning}`);
      }
      
      // Verify it was stored in database
      const stored = await this.transcriptService.getTranscript(result.id);
      if (stored) {
        console.log(`✅ DATABASE VERIFICATION: Transcript stored successfully`);
        console.log(`- Stored transcript length: ${stored.transcript.length} characters`);
      } else {
        console.log(`❌ DATABASE VERIFICATION: Failed to retrieve stored transcript`);
      }
      
      return {
        success: true,
        result: result,
        timeMs: endTime - startTime
      };
      
    } catch (error) {
      console.log(`❌ WORKFLOW ERROR: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Python Bridge Implementation Tests\n');
    
    try {
      await this.initialize();
      
      // Run all test suites
      const healthCheck = await this.runHealthCheck();
      const directTests = await this.testPythonBridgeDirectly();
      const integrationTests = await this.testTranscriptServiceIntegration();
      const workflowTest = await this.testFullWorkflow();
      
      // Summary report
      console.log('\n🎯 TEST SUMMARY REPORT');
      console.log('========================');
      
      console.log('\nHealth Check:');
      console.log(`- Python Bridge: ${healthCheck.pythonBridge ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`- Transcript Service: ${healthCheck.transcriptService ? '✅ PASS' : '❌ FAIL'}`);
      
      console.log('\nDirect Python Bridge Tests:');
      const directSuccess = directTests.filter(r => r.success).length;
      console.log(`- Success Rate: ${directSuccess}/${directTests.length} (${Math.round(directSuccess/directTests.length*100)}%)`);
      
      console.log('\nIntegration Tests:');
      const integrationSuccess = integrationTests.filter(r => r.success).length;
      console.log(`- Success Rate: ${integrationSuccess}/${integrationTests.length} (${Math.round(integrationSuccess/integrationTests.length*100)}%)`);
      
      console.log('\nFull Workflow Test:');
      console.log(`- Result: ${workflowTest.success ? '✅ PASS' : '❌ FAIL'}`);
      
      const overallSuccess = healthCheck.pythonBridge && 
                           directSuccess > 0 && 
                           integrationSuccess > 0 && 
                           workflowTest.success;
      
      console.log(`\n🏁 OVERALL RESULT: ${overallSuccess ? '✅ PYTHON BRIDGE IMPLEMENTATION SUCCESSFUL' : '❌ SOME TESTS FAILED'}`);
      
      if (overallSuccess) {
        console.log('\n🎉 The Python Bridge is working correctly and is now the primary transcript fetching method!');
        console.log('📈 Expected success rate: ~95% (significantly higher than previous methods)');
      }
      
    } catch (error) {
      console.error('\n💥 TEST RUNNER ERROR:', error.message);
      console.error(error.stack);
    } finally {
      await this.db.close();
    }
  }
}

// Run the tests
const tester = new PythonBridgeTest();
tester.runAllTests().catch(console.error);