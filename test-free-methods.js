import { Innertube } from 'youtubei.js';
import { YoutubeTranscript } from 'youtube-transcript';

// Free method 1: Direct YouTube API scraping
async function fetchTranscriptDirect(videoId) {
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const html = await response.text();
    
    // Extract player response
    const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?})\s*;/);
    if (playerResponseMatch) {
      const playerResponse = JSON.parse(playerResponseMatch[1]);
      
      if (playerResponse.captions && playerResponse.captions.playerCaptionsTracklistRenderer) {
        const captionTracks = playerResponse.captions.playerCaptionsTracklistRenderer.captionTracks;
        
        if (captionTracks && captionTracks.length > 0) {
          // Get the first available caption track
          const captionUrl = captionTracks[0].baseUrl + '&fmt=json3';
          
          const captionResponse = await fetch(captionUrl);
          const captionData = await captionResponse.json();
          
          if (captionData.events) {
            return captionData.events
              .filter(event => event.segs)
              .map(event => ({
                text: event.segs.map(seg => seg.utf8).join(' '),
                start: event.tStartMs / 1000,
                duration: event.dDurationMs / 1000
              }));
          }
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Direct method failed:', error.message);
    return null;
  }
}

// Free method 2: Updated YouTube.js with better error handling
async function fetchWithYouTubeJS(videoId) {
  try {
    const innertube = await Innertube.create({
      lang: 'en',
      location: 'US',
      enable_session_cache: false
    });
    
    const info = await innertube.getInfo(videoId);
    
    // Try to get transcript
    if (info.basic_info && info.basic_info.title) {
      console.log(`Video found: ${info.basic_info.title.text || info.basic_info.title}`);
      
      try {
        const transcript = await info.getTranscript();
        if (transcript && transcript.content) {
          console.log('Transcript object:', JSON.stringify(transcript, null, 2));
          return transcript;
        }
      } catch (transcriptError) {
        console.log('Transcript fetch error:', transcriptError.message);
      }
    }
    
    return null;
  } catch (error) {
    console.error('YouTube.js method failed:', error.message);
    return null;
  }
}

// Free method 3: Alternative transcript extraction
async function fetchAlternativeMethod(videoId) {
  try {
    // Try with different user agent and headers
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive'
      }
    });
    
    const html = await response.text();
    
    // Look for different patterns
    const patterns = [
      /ytInitialPlayerResponse\s*=\s*({.+?})\s*;/,
      /var\s+ytInitialPlayerResponse\s*=\s*({.+?})\s*;/,
      /"captions":\s*({.+?})/
    ];
    
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        try {
          const data = JSON.parse(match[1]);
          console.log('Found data with pattern:', pattern.toString());
          
          // Extract captions if available
          if (data.captions || (data.playerCaptionsTracklistRenderer)) {
            const captions = data.captions || data;
            console.log('Caption data found:', JSON.stringify(captions, null, 2));
            return captions;
          }
        } catch (parseError) {
          console.log('Parse error for pattern:', parseError.message);
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Alternative method failed:', error.message);
    return null;
  }
}

// Test all methods
async function testAllMethods() {
  // Test with videos that are likely to have captions
  const testVideos = [
    'dQw4w9WgXcQ', // Rick Roll
    'kJQP7kiw5Fk', // Despacito
    'YQHsXMglC9A', // Adele - Hello
    'fJ9rUzIMcZQ', // Queen - Bohemian Rhapsody
    'JGwWNGJdvx8'  // Ed Sheeran - Shape of You
  ];
  
  for (const videoId of testVideos) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Testing video: ${videoId}`);
    console.log(`${'='.repeat(50)}`);
    
    // Method 1: Direct scraping
    console.log('\n--- Method 1: Direct Scraping ---');
    const directResult = await fetchTranscriptDirect(videoId);
    if (directResult && directResult.length > 0) {
      console.log('✅ Direct method SUCCESS!');
      console.log(`Found ${directResult.length} transcript segments`);
      console.log('First few segments:', directResult.slice(0, 3));
      break; // Found working method, exit
    } else {
      console.log('❌ Direct method failed');
    }
    
    // Method 2: YouTube.js
    console.log('\n--- Method 2: YouTube.js ---');
    const youtubeJSResult = await fetchWithYouTubeJS(videoId);
    if (youtubeJSResult) {
      console.log('✅ YouTube.js method SUCCESS!');
      console.log('Result:', youtubeJSResult);
      break; // Found working method, exit
    } else {
      console.log('❌ YouTube.js method failed');
    }
    
    // Method 3: Alternative
    console.log('\n--- Method 3: Alternative ---');
    const altResult = await fetchAlternativeMethod(videoId);
    if (altResult) {
      console.log('✅ Alternative method found data!');
      console.log('Data:', altResult);
      break; // Found working method, exit
    } else {
      console.log('❌ Alternative method failed');
    }
    
    // Method 4: youtube-transcript package
    console.log('\n--- Method 4: youtube-transcript package ---');
    try {
      const transcriptResult = await YoutubeTranscript.fetchTranscript(videoId);
      if (transcriptResult && transcriptResult.length > 0) {
        console.log('✅ youtube-transcript SUCCESS!');
        console.log(`Found ${transcriptResult.length} segments`);
        console.log('First few segments:', transcriptResult.slice(0, 3));
        break; // Found working method, exit
      } else {
        console.log('❌ youtube-transcript returned empty');
      }
    } catch (error) {
      console.log('❌ youtube-transcript failed:', error.message);
    }
    
    console.log('\n⏳ Waiting 2 seconds before next video...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Run the tests
testAllMethods().catch(console.error); 