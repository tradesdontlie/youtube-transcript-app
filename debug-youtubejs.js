import { Innertube } from 'youtubei.js';

async function debugYouTubeJS() {
  const videoId = 'kJQP7kiw5Fk'; // Despacito (should definitely have captions)
  
  console.log('=== Debugging YouTube.js API Structure ===');
  
  try {
    console.log('1. Creating Innertube instance...');
    const innertube = await Innertube.create();
    
    console.log('2. Getting video info...');
    const info = await innertube.getInfo(videoId);
    
    console.log('3. Video info structure:');
    console.log('- Title:', info.basic_info?.title);
    console.log('- Channel:', info.basic_info?.channel?.name);
    console.log('- Duration:', info.basic_info?.duration);
    
    console.log('\n4. Exploring info object properties:');
    console.log('Available properties:', Object.keys(info));
    
    console.log('\n5. Looking for transcript/caption related properties...');
    
    // Check for various transcript-related properties
    if (info.transcript) {
      console.log('Found info.transcript:', info.transcript);
    }
    
    if (info.captions) {
      console.log('Found info.captions:', info.captions);
    }
    
    if (info.player_response) {
      console.log('Found info.player_response - checking for captions...');
      const playerResponse = info.player_response;
      if (playerResponse.captions) {
        console.log('Player response has captions:', playerResponse.captions);
      }
    }
    
    console.log('\n6. Trying getTranscript() method...');
    try {
      const transcriptInfo = await info.getTranscript();
      console.log('Transcript info structure:', transcriptInfo);
      console.log('Transcript info properties:', Object.keys(transcriptInfo));
      
      if (transcriptInfo.transcript) {
        console.log('Transcript object:', transcriptInfo.transcript);
        console.log('Transcript properties:', Object.keys(transcriptInfo.transcript));
        
        if (transcriptInfo.transcript.content) {
          console.log('Transcript content:', transcriptInfo.transcript.content);
          console.log('Content properties:', Object.keys(transcriptInfo.transcript.content));
          
          if (transcriptInfo.transcript.content.body) {
            console.log('Content body:', transcriptInfo.transcript.content.body);
            
            // Try to find segments
            const body = transcriptInfo.transcript.content.body;
            if (body.contents) {
              console.log('Body contents:', body.contents);
              console.log('Contents length:', body.contents.length);
              if (body.contents.length > 0) {
                console.log('First content item:', body.contents[0]);
                console.log('First content properties:', Object.keys(body.contents[0]));
              }
            }
            
            if (body.initial_segments) {
              console.log('Initial segments found:', body.initial_segments.length);
              if (body.initial_segments.length > 0) {
                console.log('First segment:', body.initial_segments[0]);
              }
            }
          }
        }
      }
    } catch (transcriptError) {
      console.log('getTranscript() failed:', transcriptError.message);
      console.log('Error details:', transcriptError);
    }
    
    console.log('\n7. Exploring watch_next_response for transcripts...');
    if (info.watch_next_response) {
      console.log('Watch next response available');
      // Look for transcript panels in engagement panels
      const contents = info.watch_next_response.contents;
      if (contents && contents.two_column_watch_next_results) {
        const results = contents.two_column_watch_next_results;
        if (results.secondary_results && results.secondary_results.secondary_results) {
          console.log('Secondary results found');
          const secondary = results.secondary_results.secondary_results;
          if (secondary.results) {
            console.log('Results found, checking for engagement panels...');
            for (let i = 0; i < secondary.results.length; i++) {
              const result = secondary.results[i];
              if (result.type === 'EngagementPanelSectionList') {
                console.log(`Found engagement panel at index ${i}:`, result);
              }
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Error in debugYouTubeJS:', error);
  }
}

debugYouTubeJS().catch(console.error);