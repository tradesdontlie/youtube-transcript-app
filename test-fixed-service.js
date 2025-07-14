import { TranscriptService } from './src/services/transcriptService.js';
import { DatabaseService } from './src/services/databaseService.js';

async function testFixedService() {
  console.log('=== Testing Fixed Transcript Service ===');
  
  try {
    // Initialize services
    const dbService = new DatabaseService();
    await dbService.initialize();
    
    const transcriptService = new TranscriptService(dbService);
    
    // Test video IDs
    const testVideos = [
      'kJQP7kiw5Fk', // Despacito (should have captions)
      'dQw4w9WgXcQ'  // Rick Roll (should have captions)
    ];
    
    for (const videoId of testVideos) {
      console.log(`\n--- Testing video: ${videoId} ---`);
      
      try {
        // Test the fixed fetchWithInnertube method directly
        console.log('1. Testing fetchWithInnertube...');
        const transcriptData = await transcriptService.fetchWithInnertube(videoId);
        
        if (transcriptData && transcriptData.length > 0) {
          console.log(`✅ SUCCESS: Got ${transcriptData.length} transcript segments`);
          console.log('First 3 segments:');
          transcriptData.slice(0, 3).forEach((segment, i) => {
            console.log(`   ${i + 1}. [${segment.start}s] "${segment.text}"`);
          });
          
          // Create full text
          const fullText = transcriptData.map(s => s.text).join(' ');
          console.log(`\nFull transcript preview: "${fullText.substring(0, 150)}..."`);
        } else {
          console.log('❌ No transcript data returned');
        }
      } catch (error) {
        console.log(`❌ Error with fetchWithInnertube: ${error.message}`);
      }
      
      try {
        // Test the fallback method
        console.log('\n2. Testing fallback methods...');
        const fallbackData = await transcriptService.fetchTranscriptWithFallbacks(videoId);
        
        if (fallbackData && fallbackData.length > 0) {
          console.log(`✅ SUCCESS with fallbacks: Got ${fallbackData.length} segments`);
        } else {
          console.log('❌ All fallback methods failed');
        }
      } catch (error) {
        console.log(`❌ Error with fallbacks: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testFixedService().catch(console.error);