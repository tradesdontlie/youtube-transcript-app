#!/usr/bin/env python3
import sys
sys.path.append('venv/lib/python3.13/site-packages')

from youtube_transcript_api import YouTubeTranscriptApi

try:
    # Test direct access
    transcript = YouTubeTranscriptApi.get_transcript("dQw4w9WgXcQ")
    print("Type:", type(transcript))
    print("Length:", len(transcript))
    if transcript:
        print("First item type:", type(transcript[0]))
        print("First item:", transcript[0])
        print("Keys:", transcript[0].keys() if hasattr(transcript[0], 'keys') else dir(transcript[0]))
except Exception as e:
    print("Error:", e)