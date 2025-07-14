import { Innertube } from 'youtubei.js';

async function testDiverseVideos() {
  console.log('=== Testing YouTube.js with Diverse Video Types ===');
  
  const testVideos = [
    { id: 'kJQP7kiw5Fk', description: 'Music video (Despacito)' },
    { id: 'dQw4w9WgXcQ', description: 'Music video (Rick Roll)' },
    { id: 'jNQXAC9IVRw', description: 'Tech talk video' },
    { id: 'M7lc1UVf-VE', description: 'Educational content' },
    { id: 'BAZs4StCXxI', description: 'Short form content' }
  ];
  
  const innertube = await Innertube.create();
  
  for (const video of testVideos) {
    console.log(`\n--- Testing ${video.description} (${video.id}) ---`);
    
    try {
      const info = await innertube.getInfo(video.id);
      console.log(`✅ Video info: "${info.basic_info?.title}"`);
      
      try {
        const transcriptInfo = await info.getTranscript();
        
        if (transcriptInfo && transcriptInfo.transcript && transcriptInfo.transcript.content) {
          const body = transcriptInfo.transcript.content.body;
          
          if (body && body.initial_segments && body.initial_segments.length > 0) {
            console.log(`✅ Transcript: Found ${body.initial_segments.length} segments`);
            
            // Show first segment as example
            const firstSegment = body.initial_segments[0];
            let text = '';
            if (firstSegment.snippet) {
              if (firstSegment.snippet.text) {
                text = firstSegment.snippet.text;
              } else if (firstSegment.snippet.runs) {
                text = firstSegment.snippet.runs.map(run => run.text).join('');
              }
            }
            console.log(`   First segment: "${text.trim()}"`);
          } else {
            console.log('❌ No transcript segments found');
          }
        } else {
          console.log('❌ No transcript content available');
        }
      } catch (transcriptError) {
        console.log(`❌ Transcript error: ${transcriptError.message}`);
      }
      
    } catch (error) {
      console.log(`❌ Video error: ${error.message}`);
    }
  }
}

testDiverseVideos().catch(console.error);