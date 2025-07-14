#!/usr/bin/env python3
import sys
import os

# Add venv to path
venv_path = '/Users/tradesdontlie/youtube transcript app/python_env/lib/python3.13/site-packages'
sys.path.insert(0, venv_path)

try:
    from youtube_transcript_api import YouTubeTranscriptApi
    print("✅ Import successful")
    
    # Test actual transcript fetching
    video_id = 'dQw4w9WgXcQ'
    print(f"Testing transcript for video: {video_id}")
    
    transcript = YouTubeTranscriptApi.get_transcript(video_id)
    print(f"✅ SUCCESS: Retrieved {len(transcript)} transcript segments")
    print(f"First segment: {transcript[0]}")
    
    # List available transcripts
    transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
    print(f"Available transcripts:")
    for t in transcript_list:
        print(f"  - {t.language} ({t.language_code}) - Generated: {t.is_generated}")
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()