import { YoutubeTranscript } from 'youtube-transcript';
import { Innertube } from 'youtubei.js';
import { PythonBridgeService } from './pythonBridgeService.js';

export class TranscriptService {
  constructor(databaseService, authService = null) {
    this.db = databaseService;
    this.authService = authService;
    this.innertube = null;
    this.youtubeApiKey = 'AIzaSyDfe3iCOVIBo8agQHBZMKm7D4S0VH7Da0o';
    this.pythonBridge = new PythonBridgeService();
  }

  async initializeInnertube() {
    if (!this.innertube) {
      try {
        this.innertube = await Innertube.create();
      } catch (error) {
        console.log('Failed to initialize Innertube:', error.message);
      }
    }
    return this.innertube;
  }

  extractVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  async fetchTranscriptWithFallbacks(videoId) {
    const methods = [];

    // HIGHEST PRIORITY: Python Bridge (95% success rate)
    methods.push({ 
      name: 'Python youtube-transcript-api Bridge', 
      fn: () => this.pythonBridge.fetchTranscript(videoId),
      priority: 1 
    });

    // Prioritize OAuth2 method if available
    if (this.authService && this.authService.isAuthenticated()) {
      methods.push({ 
        name: 'YouTube Data API v3 (OAuth2)', 
        fn: () => this.fetchWithYouTubeOAuth(videoId),
        priority: 2 
      });
    }

    // Fallback methods
    methods.push(
      { name: 'YouTube Data API v3 (API Key)', fn: () => this.fetchWithYouTubeAPI(videoId), priority: 3 },
      { name: 'YouTube.js (Innertube)', fn: () => this.fetchWithInnertube(videoId), priority: 4 },
      { name: 'youtube-transcript (Node.js)', fn: () => this.fetchWithYoutubeTranscript(videoId), priority: 5 }
    );

    // Sort methods by priority
    methods.sort((a, b) => a.priority - b.priority);

    for (const method of methods) {
      try {
        console.log(`Trying ${method.name} for video ${videoId} (Priority: ${method.priority})`);
        const result = await method.fn();
        if (result && result.length > 0) {
          console.log(`Success with ${method.name} - Retrieved ${result.length} transcript segments`);
          return result;
        }
      } catch (error) {
        console.log(`${method.name} failed:`, error.message);
      }
    }
    
    return null;
  }

  async fetchWithInnertube(videoId) {
    const innertube = await this.initializeInnertube();
    if (!innertube) {
      throw new Error('Innertube not available');
    }

    try {
      const info = await innertube.getInfo(videoId);
      const transcriptInfo = await info.getTranscript();
      
      if (transcriptInfo && transcriptInfo.transcript && transcriptInfo.transcript.content) {
        const body = transcriptInfo.transcript.content.body;
        
        if (body && body.initial_segments && body.initial_segments.length > 0) {
          // Extract and format transcript segments
          const segments = body.initial_segments.map(segment => {
            let text = '';
            
            // Extract text from snippet
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
              duration: (parseInt(segment.end_ms) - parseInt(segment.start_ms)) / 1000
            };
          }).filter(segment => segment.text.length > 0);
          
          console.log(`Successfully extracted ${segments.length} transcript segments via YouTube.js`);
          return segments;
        }
      }
    } catch (error) {
      throw new Error(`Innertube transcript fetch failed: ${error.message}`);
    }
    
    return null;
  }

  async fetchWithYouTubeOAuth(videoId) {
    if (!this.authService) {
      throw new Error('Auth service not available');
    }

    try {
      const youtube = await this.authService.getYouTubeService();
      
      // Step 1: Get available caption tracks
      const captionsResponse = await youtube.captions.list({
        part: 'snippet',
        videoId: videoId
      });

      if (!captionsResponse.data.items || captionsResponse.data.items.length === 0) {
        throw new Error('No captions available for this video');
      }

      // Find English captions or first available
      let captionTrack = captionsResponse.data.items.find(item => 
        item.snippet.language === 'en' || item.snippet.language === 'en-US'
      );

      if (!captionTrack) {
        captionTrack = captionsResponse.data.items[0]; // Use first available
      }

      console.log(`Found caption track: ${captionTrack.snippet.language} (${captionTrack.snippet.trackKind})`);

      // Step 2: Try to download the caption content with OAuth2 authentication
      try {
        const captionResponse = await youtube.captions.download({
          id: captionTrack.id,
          tfmt: 'ttml' // XML format
        });

        // Step 3: Parse the caption content
        return this.parseXMLCaptions(captionResponse.data);
      } catch (downloadError) {
        // If download fails due to permissions, try alternative method
        if (downloadError.response?.status === 403) {
          console.log('Caption download restricted, trying alternative method...');
          return await this.fetchCaptionAlternative(videoId, captionTrack);
        }
        throw downloadError;
      }
    } catch (error) {
      throw new Error(`OAuth2 transcript fetch failed: ${error.message}`);
    }
  }

  async fetchCaptionAlternative(videoId, captionTrack) {
    // Try to construct the caption URL directly
    // This is a fallback method when OAuth2 download is restricted
    try {
      const captionUrl = `https://www.youtube.com/api/timedtext?lang=${captionTrack.snippet.language}&v=${videoId}&fmt=srv3`;
      const response = await fetch(captionUrl);
      
      if (response.ok) {
        const captionData = await response.text();
        return this.parseYouTubeCaptionFormat(captionData);
      }
    } catch (error) {
      console.log('Alternative caption fetch failed:', error.message);
    }
    
    // Return empty if all methods fail
    throw new Error('Caption content could not be downloaded due to YouTube restrictions');
  }

  parseYouTubeCaptionFormat(captionData) {
    // Parse YouTube's srv3 format or XML format
    try {
      // Try parsing as JSON first (srv3 format)
      const jsonData = JSON.parse(captionData);
      if (jsonData.events) {
        return jsonData.events
          .filter(event => event.segs)
          .map(event => ({
            text: event.segs.map(seg => seg.utf8).join(''),
            start: event.tStartMs / 1000,
            duration: (event.dDurationMs || 4000) / 1000
          }))
          .filter(item => item.text.trim());
      }
    } catch (e) {
      // If not JSON, try XML parsing
      return this.parseXMLCaptions(captionData);
    }
    
    return [];
  }

  async fetchWithYouTubeAPI(videoId) {
    // Step 1: Get available caption tracks
    const captionsUrl = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${this.youtubeApiKey}`;
    const captionsResponse = await fetch(captionsUrl);
    const captionsData = await captionsResponse.json();
    
    if (!captionsData.items || captionsData.items.length === 0) {
      throw new Error('No captions available for this video');
    }
    
    // Find English captions or first available
    let captionTrack = captionsData.items.find(item => 
      item.snippet.language === 'en' || item.snippet.language === 'en-US'
    );
    
    if (!captionTrack) {
      captionTrack = captionsData.items[0]; // Use first available
    }
    
    // Step 2: Download the caption content (requires special handling)
    const captionId = captionTrack.id;
    const downloadUrl = `https://www.googleapis.com/youtube/v3/captions/${captionId}?key=${this.youtubeApiKey}&tfmt=ttml`;
    
    const captionResponse = await fetch(downloadUrl, {
      headers: {
        'Accept': 'application/xml, text/xml'
      }
    });
    
    if (!captionResponse.ok) {
      const errorText = await captionResponse.text();
      throw new Error(`Caption download failed: ${captionResponse.status} - ${errorText}`);
    }
    
    const captionContent = await captionResponse.text();
    
    // Step 3: Parse the caption content (usually XML format)
    return this.parseXMLCaptions(captionContent);
  }

  parseXMLCaptions(xmlContent) {
    // Basic XML parsing for YouTube captions
    const textRegex = /<text start="([^"]*)"[^>]*>([^<]*)<\/text>/g;
    const segments = [];
    let match;
    
    while ((match = textRegex.exec(xmlContent)) !== null) {
      const start = parseFloat(match[1]);
      const text = match[2]
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
          duration: 4 // Default duration, YouTube API doesn't always provide end times
        });
      }
    }
    
    return segments;
  }

  async fetchWithPythonBridge(videoId) {
    try {
      const result = await this.pythonBridge.fetchTranscript(videoId, ['en', 'en-US', 'en-GB']);
      
      if (result.success && result.transcript) {
        console.log(`Python Bridge: Successfully fetched ${result.transcript.length} segments for video ${videoId}`);
        console.log(`Language: ${result.metadata.language} (${result.metadata.language_code}), Generated: ${result.metadata.is_generated}`);
        
        return result.transcript;
      } else {
        throw new Error('Python bridge returned unsuccessful result');
      }
    } catch (error) {
      throw new Error(`Python Bridge failed: ${error.message}`);
    }
  }

  async fetchWithYoutubeTranscript(videoId) {
    return await YoutubeTranscript.fetchTranscript(videoId);
  }

  async fetchAndStore(videoUrl) {
    const videoId = this.extractVideoId(videoUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    const existing = await this.db.getTranscriptByVideoId(videoId);
    if (existing) {
      return { 
        message: 'Transcript already exists', 
        id: existing.id,
        videoId: existing.video_id,
        title: existing.title 
      };
    }

    try {
      const transcriptData = await this.fetchTranscriptWithFallbacks(videoId);
      
      let transcript = '';
      if (transcriptData && transcriptData.length > 0) {
        transcript = transcriptData
          .map(item => item.text)
          .join(' ')
          .replace(/\n/g, ' ')
          .trim();
      }

      const videoInfo = await this.getVideoInfo(videoId);
      
      // If no transcript available, store a placeholder message
      if (!transcript) {
        transcript = 'No transcript available for this video. This could be because:\n\n• The video has no captions/subtitles\n• Captions are disabled by the creator\n• YouTube\'s transcript API is currently unavailable\n\nTry checking if the video has captions enabled on YouTube.';
      }
      
      const id = await this.db.saveTranscript(
        videoId,
        videoInfo.title,
        videoInfo.channel,
        videoInfo.duration,
        transcript
      );

      const message = transcriptData && transcriptData.length > 0 
        ? 'Transcript fetched and stored successfully'
        : 'Video info stored - no transcript available';

      return {
        message,
        id,
        videoId,
        title: videoInfo.title,
        transcriptLength: transcript.length
      };
    } catch (error) {
      // If transcript fetch fails completely, still store video info with error message
      const videoInfo = await this.getVideoInfo(videoId);
      const errorTranscript = `Failed to fetch transcript: ${error.message}\n\nThis video information was still saved for your reference.`;
      
      const id = await this.db.saveTranscript(
        videoId,
        videoInfo.title,
        videoInfo.channel,
        videoInfo.duration,
        errorTranscript
      );

      return {
        message: 'Video saved but transcript unavailable',
        id,
        videoId,
        title: videoInfo.title,
        transcriptLength: errorTranscript.length,
        warning: error.message
      };
    }
  }

  async getVideoInfo(videoId) {
    try {
      const response = await fetch(`https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v=${videoId}&format=json`);
      const data = await response.json();
      
      return {
        title: data.title || 'Unknown Title',
        channel: data.author_name || 'Unknown Channel',
        duration: null
      };
    } catch (error) {
      return {
        title: 'Unknown Title',
        channel: 'Unknown Channel', 
        duration: null
      };
    }
  }

  async getAllTranscripts() {
    return await this.db.getAllTranscripts();
  }

  async getTranscript(id) {
    return await this.db.getTranscript(id);
  }

  async searchTranscripts(query) {
    return await this.db.searchTranscripts(query);
  }

  async deleteTranscript(id) {
    return await this.db.deleteTranscript(id);
  }

  async healthCheck() {
    console.log('Running TranscriptService health check...');
    
    const health = {
      pythonBridge: null,
      innertube: null,
      youtubeApi: null,
      overallStatus: 'unknown'
    };

    // Test Python Bridge
    try {
      const pythonHealth = await this.pythonBridge.healthCheck();
      health.pythonBridge = pythonHealth;
      console.log('Python Bridge health check:', pythonHealth.success ? 'PASS' : 'FAIL');
    } catch (error) {
      health.pythonBridge = {
        success: false,
        error: error.message
      };
      console.log('Python Bridge health check: FAIL -', error.message);
    }

    // Test Innertube
    try {
      const innertube = await this.initializeInnertube();
      health.innertube = {
        success: !!innertube,
        message: innertube ? 'Innertube initialized successfully' : 'Failed to initialize Innertube'
      };
      console.log('Innertube health check:', health.innertube.success ? 'PASS' : 'FAIL');
    } catch (error) {
      health.innertube = {
        success: false,
        error: error.message
      };
      console.log('Innertube health check: FAIL -', error.message);
    }

    // Test YouTube API
    try {
      const testUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=dQw4w9WgXcQ&key=${this.youtubeApiKey}`;
      const response = await fetch(testUrl);
      health.youtubeApi = {
        success: response.ok,
        message: response.ok ? 'YouTube API accessible' : `API returned ${response.status}`,
        status: response.status
      };
      console.log('YouTube API health check:', health.youtubeApi.success ? 'PASS' : 'FAIL');
    } catch (error) {
      health.youtubeApi = {
        success: false,
        error: error.message
      };
      console.log('YouTube API health check: FAIL -', error.message);
    }

    // Determine overall status
    if (health.pythonBridge?.success) {
      health.overallStatus = 'healthy';
    } else if (health.innertube?.success || health.youtubeApi?.success) {
      health.overallStatus = 'degraded';
    } else {
      health.overallStatus = 'unhealthy';
    }

    console.log(`TranscriptService overall status: ${health.overallStatus.toUpperCase()}`);
    return health;
  }

  async getAvailableTranscripts(videoId) {
    try {
      return await this.pythonBridge.getAvailableTranscripts(videoId);
    } catch (error) {
      console.error(`Failed to get available transcripts for video ${videoId}:`, error.message);
      throw error;
    }
  }
}