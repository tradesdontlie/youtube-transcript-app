import { DatabaseService } from './src/services/databaseService.js';

async function testDatabase() {
  console.log('Testing database connection...');
  
  const db = new DatabaseService();
  
  try {
    await db.initialize();
    console.log('✅ Database initialized successfully');
    
    // Test saving a transcript
    await db.saveTranscript(
      'test123',
      'Test Video',
      'Test Channel',
      120,
      'This is a test transcript'
    );
    console.log('✅ Test transcript saved successfully');
    
    // Test retrieving the transcript
    const retrieved = await db.getTranscriptByVideoId('test123');
    if (retrieved) {
      console.log('✅ Test transcript retrieved successfully');
      console.log('Retrieved data:', {
        id: retrieved.id,
        video_id: retrieved.video_id,
        title: retrieved.title,
        transcript_length: retrieved.transcript.length
      });
    } else {
      console.log('❌ Failed to retrieve test transcript');
    }
    
    // Test search functionality
    const searchResults = await db.searchTranscripts('test');
    console.log('✅ Search test completed, found', searchResults.length, 'results');
    
  } catch (error) {
    console.log('❌ Database test failed:', error.message);
  } finally {
    await db.close();
  }
}

testDatabase();