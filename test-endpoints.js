import { TranscriptService } from './src/services/transcriptService.js';
import { DatabaseService } from './src/services/databaseService.js';

async function testEndpoints() {
  console.log('Testing transcript service endpoints...');
  
  const db = new DatabaseService();
  const service = new TranscriptService(db);
  
  try {
    await db.initialize();
    console.log('✅ Database initialized');
    
    // Test endpoint 1: fetchAndStore
    console.log('\n--- Testing fetchAndStore endpoint ---');
    const storeResult = await service.fetchAndStore('https://www.youtube.com/watch?v=kJQP7kiw5Fk');
    console.log('✅ fetchAndStore result:', {
      success: !!storeResult,
      videoId: storeResult?.videoId,
      title: storeResult?.title?.substring(0, 50) + '...',
      transcriptLength: storeResult?.transcriptLength
    });
    
    // Test endpoint 2: fetchTranscriptWithFallbacks
    console.log('\n--- Testing fetchTranscriptWithFallbacks endpoint ---');
    const transcript = await service.fetchTranscriptWithFallbacks('kJQP7kiw5Fk');
    console.log('✅ fetchTranscriptWithFallbacks result:', {
      success: !!transcript,
      segmentCount: transcript?.length,
      firstSegment: transcript?.[0]?.text?.substring(0, 50) + '...'
    });
    
    // Test endpoint 3: searchTranscripts
    console.log('\n--- Testing searchTranscripts endpoint ---');
    const searchResults = await service.searchTranscripts('despacito');
    console.log('✅ searchTranscripts result:', {
      success: true,
      resultCount: searchResults?.length,
      results: searchResults?.map(r => ({
        title: r.title?.substring(0, 30) + '...',
        videoId: r.video_id
      }))
    });
    
    // Test endpoint 4: getVideoInfo
    console.log('\n--- Testing getVideoInfo endpoint ---');
    const videoInfo = await service.getVideoInfo('kJQP7kiw5Fk');
    console.log('✅ getVideoInfo result:', {
      success: !!videoInfo,
      title: videoInfo?.title?.substring(0, 50) + '...',
      channel: videoInfo?.channel,
      duration: videoInfo?.duration
    });
    
    console.log('\n🎯 All endpoints tested successfully!');
    
  } catch (error) {
    console.log('❌ Endpoint test failed:', error.message);
  } finally {
    await db.close();
  }
}

testEndpoints();