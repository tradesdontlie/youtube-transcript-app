#!/usr/bin/env python3
import json
import sys

try:
    from youtube_transcript_api import YouTubeTranscriptApi
    print(json.dumps({"success": True, "message": "Import successful"}))
    
    # Test with a video
    video_id = sys.argv[1] if len(sys.argv) > 1 else 'dQw4w9WgXcQ'
    
    transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
    transcripts = []
    for transcript in transcript_list:
        transcripts.append({
            "language": transcript.language,
            "language_code": transcript.language_code,
            "is_generated": transcript.is_generated
        })
    
    print(json.dumps({
        "success": True,
        "video_id": video_id,
        "available_transcripts": transcripts
    }))
    
except Exception as e:
    print(json.dumps({
        "success": False,
        "error": str(e)
    }))