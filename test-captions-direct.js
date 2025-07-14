import { Innertube } from 'youtubei.js';

async function testCaptionsDirect() {
  const videoId = 'kJQP7kiw5Fk'; // Despacito (should definitely have captions)
  
  console.log('=== Testing Direct Caption Track Access ===');
  
  try {
    console.log('1. Creating Innertube instance...');
    const innertube = await Innertube.create();
    
    console.log('2. Getting video info...');
    const info = await innertube.getInfo(videoId);
    
    console.log('3. Checking captions property...');
    if (info.captions && info.captions.caption_tracks) {
      console.log(`Found ${info.captions.caption_tracks.length} caption tracks`);
      
      // Find English captions
      const englishTrack = info.captions.caption_tracks.find(track => 
        track.language_code === 'en'
      );
      
      if (englishTrack) {
        console.log('Found English caption track:', {
          language_code: englishTrack.language_code,
          name: englishTrack.name?.text || englishTrack.name,
          base_url: englishTrack.base_url?.substring(0, 100) + '...'
        });
        
        // Try to fetch the caption data directly
        console.log('4. Fetching caption data from base URL...');
        try {
          const response = await fetch(englishTrack.base_url);
          const captionData = await response.text();
          
          console.log('Caption data preview (first 500 chars):');
          console.log(captionData.substring(0, 500));
          
          // Try to parse XML format
          console.log('\n5. Trying to extract text segments...');
          const textRegex = /<text start="([^"]*)"[^>]*dur="([^"]*)"[^>]*>([^<]*)<\/text>/g;
          const segments = [];
          let match;
          
          while ((match = textRegex.exec(captionData)) !== null) {
            const start = parseFloat(match[1]);
            const duration = parseFloat(match[2]);
            const text = match[3]
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
              .trim();
            
            if (text) {
              segments.push({
                text: text,
                start: start,
                duration: duration
              });
            }
          }
          
          console.log(`Extracted ${segments.length} segments from XML`);
          if (segments.length > 0) {
            console.log('First 3 segments:');
            segments.slice(0, 3).forEach((segment, i) => {
              console.log(`${i + 1}. [${segment.start}s] "${segment.text}"`);
            });
          }
          
        } catch (fetchError) {
          console.log('Failed to fetch caption data:', fetchError.message);
        }
      } else {
        console.log('No English caption track found');
        console.log('Available languages:', info.captions.caption_tracks.map(t => t.language_code));
      }
    } else {
      console.log('No captions found');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testCaptionsDirect().catch(console.error);