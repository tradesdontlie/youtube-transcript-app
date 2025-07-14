import { AuthService } from './src/services/authService.js';

async function testOAuthTranscript() {
  const videoId = 'L_jWHffIx5E'; // Smash Mouth - All Star
  
  try {
    const authService = new AuthService();
    await authService.initialize();
    
    if (!authService.isAuthenticated()) {
      console.log('Not authenticated! Visit http://localhost:3000/auth first');
      return;
    }
    
    console.log('✅ Authenticated! Testing OAuth transcript fetch...');
    
    const youtube = await authService.getYouTubeService();
    
    // Step 1: Get available caption tracks
    console.log('📋 Getting caption tracks...');
    const captionsResponse = await youtube.captions.list({
      part: 'snippet',
      videoId: videoId
    });

    console.log('Found', captionsResponse.data.items?.length || 0, 'caption tracks');
    
    if (!captionsResponse.data.items || captionsResponse.data.items.length === 0) {
      console.log('❌ No captions available for this video');
      return;
    }

    // Show all available tracks
    captionsResponse.data.items.forEach((item, i) => {
      console.log(`Track ${i}:`, {
        id: item.id,
        language: item.snippet.language,
        name: item.snippet.name,
        trackKind: item.snippet.trackKind
      });
    });

    // Find English captions or first available
    let captionTrack = captionsResponse.data.items.find(item => 
      item.snippet.language === 'en' || item.snippet.language === 'en-US'
    );

    if (!captionTrack) {
      captionTrack = captionsResponse.data.items[0]; // Use first available
    }

    console.log('🎯 Using track:', captionTrack.snippet.language, captionTrack.snippet.trackKind);

    // Step 2: Download the caption content with OAuth2 authentication
    console.log('⬇️ Downloading captions...');
    const captionResponse = await youtube.captions.download({
      id: captionTrack.id,
      tfmt: 'ttml' // XML format
    });

    console.log('📄 Downloaded caption data type:', typeof captionResponse.data);
    console.log('📄 First 500 chars:', captionResponse.data.substring(0, 500));
    
    // Test parsing
    const textRegex = /<text[^>]*>([^<]*)<\/text>/g;
    const segments = [];
    let match;
    let count = 0;
    
    while ((match = textRegex.exec(captionResponse.data)) !== null && count < 5) {
      segments.push({
        text: match[1].trim(),
        raw: match[0]
      });
      count++;
    }
    
    console.log('🎯 Parsed', segments.length, 'segments (showing first 5)');
    segments.forEach((seg, i) => {
      console.log(`${i + 1}:`, seg.text);
    });

  } catch (error) {
    console.log('❌ Error:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

testOAuthTranscript().catch(console.error);