#!/usr/bin/env node

// Test the fetch transcript function
try {
  console.log('Loading services...');
  const { TranscriptService } = await import('../../src/services/transcriptService.js');
  const { DatabaseService } = await import('../../src/services/databaseService.js');
  
  console.log('Creating instances...');
  const dbService = new DatabaseService();
  const transcriptService = new TranscriptService(dbService);
  
  console.log('Fetching transcript for dQw4w9WgXcQ...');
  const transcript = await transcriptService.fetchTranscriptWithFallbacks('dQw4w9WgXcQ');
  
  if (transcript && transcript.length > 0) {
    console.log(`Successfully fetched ${transcript.length} segments`);
    console.log('First segment:', transcript[0]);
    
    // Get video info
    const videoInfo = await transcriptService.getVideoInfo('dQw4w9WgXcQ');
    console.log('Video info:', videoInfo);
    
    const result = {
      success: true,
      video_info: {
        video_id: 'dQw4w9WgXcQ',
        title: videoInfo.title,
        channel: videoInfo.channel,
        duration: videoInfo.duration
      },
      transcript: transcript.slice(0, 3).map(segment => ({
        text: segment.text,
        start: segment.start,
        duration: segment.duration
      }))
    };
    
    console.log('JSON output:');
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('No transcript found');
  }
  
} catch (error) {
  console.error('Error:', error.message);
  console.error(error.stack);
}