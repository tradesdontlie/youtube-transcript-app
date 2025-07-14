import { AuthService } from './src/services/authService.js';

async function testSpecificVideo() {
  const videoId = 'sQriXU7yCss';
  const apiKey = 'AIzaSyDfe3iCOVIBo8agQHBZMKm7D4S0VH7Da0o';
  
  console.log(`Testing video: ${videoId} (July 11 2025 - Reengineering)`);
  
  // Test 1: Check if OAuth2 can find captions
  console.log('\n=== OAuth2 Caption Check ===');
  try {
    const authService = new AuthService();
    await authService.initialize();
    
    if (authService.isAuthenticated()) {
      const youtube = await authService.getYouTubeService();
      const captionsResponse = await youtube.captions.list({
        part: 'snippet',
        videoId: videoId
      });
      
      console.log('Found', captionsResponse.data.items?.length || 0, 'caption tracks');
      if (captionsResponse.data.items?.length > 0) {
        captionsResponse.data.items.forEach((item, i) => {
          console.log(`Track ${i}:`, {
            language: item.snippet.language,
            name: item.snippet.name,
            trackKind: item.snippet.trackKind
          });
        });
      }
    } else {
      console.log('Not authenticated with OAuth2');
    }
  } catch (error) {
    console.log('OAuth2 error:', error.message);
  }
  
  // Test 2: Try API Key method
  console.log('\n=== API Key Caption Check ===');
  try {
    const captionsUrl = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${apiKey}`;
    const response = await fetch(captionsUrl);
    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
      console.log('Found', data.items.length, 'caption tracks via API key');
      data.items.forEach((item, i) => {
        console.log(`Track ${i}:`, {
          language: item.snippet.language,
          name: item.snippet.name,
          trackKind: item.snippet.trackKind
        });
      });
    } else {
      console.log('No caption tracks found via API key');
      if (data.error) {
        console.log('API error:', data.error.message);
      }
    }
  } catch (error) {
    console.log('API Key error:', error.message);
  }
}

testSpecificVideo().catch(console.error);