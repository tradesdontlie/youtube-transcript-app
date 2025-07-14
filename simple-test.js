async function testTranscript() {
  const videoId = 'dQw4w9WgXcQ'; // Rick Roll
  
  try {
    console.log('🚀 Testing free transcript extraction...');
    console.log('Video ID:', videoId);
    
    // Step 1: Fetch YouTube page
    console.log('📄 Fetching YouTube page...');
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    console.log('✅ Page fetched successfully');
    
    // Step 2: Extract player response
    console.log('🔍 Extracting player response...');
    const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?})\s*;/);
    
    if (!playerResponseMatch) {
      throw new Error('Could not find ytInitialPlayerResponse');
    }
    
    const playerResponse = JSON.parse(playerResponseMatch[1]);
    console.log('✅ Player response extracted');
    
    // Step 3: Check for captions
    console.log('🎬 Checking for captions...');
    const captions = playerResponse.captions?.playerCaptionsTracklistRenderer;
    
    if (!captions) {
      throw new Error('No captions object found');
    }
    
    if (!captions.captionTracks || captions.captionTracks.length === 0) {
      throw new Error('No caption tracks available');
    }
    
    console.log(`✅ Found ${captions.captionTracks.length} caption tracks`);
    
    // Step 4: Get first caption track
    const track = captions.captionTracks[0];
    console.log('📝 Caption track info:');
    console.log('  - Language:', track.languageCode);
    console.log('  - Name:', track.name?.simpleText || 'Unknown');
    console.log('  - Auto-generated:', track.vssId?.includes('a.') || track.kind === 'asr');
    
    // Step 5: Fetch transcript
    console.log('📥 Fetching transcript data...');
    const transcriptUrl = track.baseUrl + '&fmt=json3';
    const transcriptResponse = await fetch(transcriptUrl);
    
    if (!transcriptResponse.ok) {
      throw new Error(`Transcript fetch failed: ${transcriptResponse.status}`);
    }
    
    const transcriptData = await transcriptResponse.json();
    console.log('✅ Transcript data fetched');
    
    // Step 6: Parse transcript
    if (!transcriptData.events) {
      throw new Error('No events in transcript data');
    }
    
    const segments = transcriptData.events
      .filter(event => event.segs)
      .map(event => ({
        text: event.segs.map(seg => seg.utf8).join(' ').trim(),
        start: event.tStartMs / 1000,
        duration: event.dDurationMs / 1000
      }))
      .filter(segment => segment.text);
    
    console.log(`🎉 SUCCESS! Extracted ${segments.length} transcript segments`);
    
    if (segments.length > 0) {
      console.log('\n📋 First 5 segments:');
      segments.slice(0, 5).forEach((segment, index) => {
        console.log(`${index + 1}. [${segment.start.toFixed(1)}s] "${segment.text}"`);
      });
    }
    
    return segments;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

// Run the test
testTranscript(); 