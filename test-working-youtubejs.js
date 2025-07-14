import { Innertube } from 'youtubei.js';

async function testWorkingYouTubeJS() {
  const videoId = 'kJQP7kiw5Fk'; // Despacito (should definitely have captions)
  
  console.log('=== Testing Working YouTube.js Transcript Extraction ===');
  
  try {
    console.log('1. Creating Innertube instance...');
    const innertube = await Innertube.create();
    
    console.log('2. Getting video info...');
    const info = await innertube.getInfo(videoId);
    
    console.log('3. Getting transcript...');
    const transcriptInfo = await info.getTranscript();
    
    if (transcriptInfo && transcriptInfo.transcript && transcriptInfo.transcript.content) {
      const body = transcriptInfo.transcript.content.body;
      
      if (body && body.initial_segments) {
        console.log(`Found ${body.initial_segments.length} transcript segments`);
        
        // Extract text from first few segments to test structure
        console.log('\n4. Sample transcript segments:');
        for (let i = 0; i < Math.min(5, body.initial_segments.length); i++) {
          const segment = body.initial_segments[i];
          console.log(`Segment ${i}:`, {
            start_ms: segment.start_ms,
            end_ms: segment.end_ms,
            start_time_text: segment.start_time_text?.text || segment.start_time_text,
            snippet_text: segment.snippet?.text || segment.snippet,
            segment_keys: Object.keys(segment)
          });
          
          // Try to extract text from snippet
          if (segment.snippet) {
            if (segment.snippet.text) {
              console.log(`  Text: "${segment.snippet.text}"`);
            } else if (segment.snippet.runs) {
              const text = segment.snippet.runs.map(run => run.text).join('');
              console.log(`  Text from runs: "${text}"`);
            } else {
              console.log(`  Snippet type: ${typeof segment.snippet}`, segment.snippet);
            }
          }
        }
        
        // Extract all segments and format them
        console.log('\n5. Formatting complete transcript...');
        const segments = body.initial_segments.map(segment => {
          let text = '';
          
          if (segment.snippet) {
            if (segment.snippet.text) {
              text = segment.snippet.text;
            } else if (segment.snippet.runs) {
              text = segment.snippet.runs.map(run => run.text).join('');
            }
          }
          
          return {
            text: text.trim(),
            start: parseInt(segment.start_ms) / 1000,
            end: parseInt(segment.end_ms) / 1000,
            duration: (parseInt(segment.end_ms) - parseInt(segment.start_ms)) / 1000
          };
        }).filter(segment => segment.text.length > 0);
        
        console.log(`Successfully extracted ${segments.length} transcript segments`);
        console.log('\nFirst 3 formatted segments:');
        segments.slice(0, 3).forEach((segment, i) => {
          console.log(`${i + 1}. [${segment.start}s - ${segment.end}s] "${segment.text}"`);
        });
        
        // Create full transcript text
        const fullTranscript = segments.map(s => s.text).join(' ');
        console.log('\nFull transcript preview (first 200 chars):');
        console.log(`"${fullTranscript.substring(0, 200)}..."`);
        
        return segments;
      } else {
        console.log('No initial_segments found in transcript body');
      }
    } else {
      console.log('No transcript content found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testWorkingYouTubeJS().catch(console.error);