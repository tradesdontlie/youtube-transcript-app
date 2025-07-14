import { Innertube } from 'youtubei.js';
import { YoutubeTranscript } from 'youtube-transcript';

async function testTranscripts() {
  const videoId = 'kJQP7kiw5Fk'; // Despacito (should definitely have captions)
  const apiKey = 'AIzaSyDfe3iCOVIBo8agQHBZMKm7D4S0VH7Da0o';
  
  console.log(`Testing transcript extraction for video: ${videoId}`);
  
  // Test 0: YouTube Data API v3
  console.log('\n=== Testing YouTube Data API v3 ===');
  try {
    const captionsUrl = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${apiKey}`;
    const captionsResponse = await fetch(captionsUrl);
    const captionsData = await captionsResponse.json();
    
    console.log('Captions API response:', captionsData);
    
    if (captionsData.items && captionsData.items.length > 0) {
      console.log('Found', captionsData.items.length, 'caption tracks');
      captionsData.items.forEach((item, i) => {
        console.log(`Track ${i}:`, {
          id: item.id,
          language: item.snippet.language,
          name: item.snippet.name,
          trackKind: item.snippet.trackKind
        });
      });
      
      // Try to download English captions
      const englishTrack = captionsData.items.find(item => 
        item.snippet.language === 'en'
      );
      
      if (englishTrack) {
        console.log('\nTrying to download English captions...');
        try {
          const downloadUrl = `https://www.googleapis.com/youtube/v3/captions/${englishTrack.id}?key=${apiKey}&tfmt=ttml`;
          const captionResponse = await fetch(downloadUrl);
          console.log('Download response status:', captionResponse.status);
          const captionText = await captionResponse.text();
          console.log('Caption content preview:', captionText.substring(0, 500));
        } catch (downloadError) {
          console.log('Caption download error:', downloadError.message);
        }
      }
    } else {
      console.log('No caption tracks found');
    }
  } catch (error) {
    console.log('YouTube Data API error:', error.message);
  }
  
  // Test 1: YouTube.js (Innertube)
  console.log('\n=== Testing YouTube.js (Innertube) ===');
  try {
    const innertube = await Innertube.create();
    const info = await innertube.getInfo(videoId);
    console.log('Video info fetched successfully');
    console.log('Title:', info.basic_info.title);
    console.log('Channel:', info.basic_info.channel.name);
    
    try {
      const transcriptData = await info.getTranscript();
      console.log('Transcript data:', transcriptData);
      
      if (transcriptData && transcriptData.content) {
        console.log('Transcript content available');
        console.log('Content type:', typeof transcriptData.content);
        console.log('Content keys:', Object.keys(transcriptData.content));
      } else {
        console.log('No transcript content found');
      }
    } catch (transcriptError) {
      console.log('Transcript fetch error:', transcriptError.message);
    }
  } catch (error) {
    console.log('Innertube error:', error.message);
  }
  
  // Test 2: youtube-transcript
  console.log('\n=== Testing youtube-transcript ===');
  try {
    const transcriptData = await YoutubeTranscript.fetchTranscript(videoId);
    console.log('Success! Found', transcriptData.length, 'transcript segments');
    if (transcriptData.length > 0) {
      console.log('First few segments:');
      console.log(transcriptData.slice(0, 3));
    }
  } catch (error) {
    console.log('youtube-transcript error:', error.message);
  }
}

testTranscripts().catch(console.error);