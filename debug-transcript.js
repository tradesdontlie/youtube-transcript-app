async function debugTranscript() {
  const videoId = 'dQw4w9WgXcQ';
  
  try {
    console.log('🔍 Debugging transcript extraction...');
    
    // Get the page
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    const html = await response.text();
    const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?})\s*;/);
    const playerResponse = JSON.parse(playerResponseMatch[1]);
    
    const captions = playerResponse.captions?.playerCaptionsTracklistRenderer;
    const track = captions.captionTracks[0];
    
    console.log('📝 Base URL:', track.baseUrl);
    
    // Try different formats
    const formats = ['json3', 'srv1', 'srv2', 'srv3', 'ttml', 'vtt'];
    
    for (const fmt of formats) {
      try {
        console.log(`\n🧪 Testing format: ${fmt}`);
        const testUrl = track.baseUrl + `&fmt=${fmt}`;
        console.log('URL:', testUrl);
        
        const testResponse = await fetch(testUrl);
        console.log('Status:', testResponse.status);
        console.log('Content-Type:', testResponse.headers.get('content-type'));
        
        if (testResponse.ok) {
          const content = await testResponse.text();
          console.log('Content length:', content.length);
          console.log('First 200 chars:', content.substring(0, 200));
          
          // Try to parse as JSON if it looks like JSON
          if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
            try {
              const parsed = JSON.parse(content);
              console.log('✅ JSON parsed successfully');
              console.log('Keys:', Object.keys(parsed));
              
              if (parsed.events) {
                console.log('Events found:', parsed.events.length);
                const firstEvent = parsed.events.find(e => e.segs);
                if (firstEvent) {
                  console.log('First text:', firstEvent.segs.map(s => s.utf8).join(' '));
                }
              }
              
              break; // Found working format
            } catch (e) {
              console.log('❌ JSON parse failed:', e.message);
            }
          }
        }
        
      } catch (error) {
        console.log('❌ Format failed:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugTranscript(); 