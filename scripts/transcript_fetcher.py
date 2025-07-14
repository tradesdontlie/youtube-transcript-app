#!/usr/bin/env python3
"""
High-reliability YouTube transcript fetcher using youtube-transcript-api
Usage: python transcript_fetcher.py <video_id>
"""

import json
import sys
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound


def fetch_transcript(video_id):
    """
    Fetch transcript for a YouTube video with comprehensive error handling
    """
    try:
        # Try simple approach first
        try:
            transcript_data = YouTubeTranscriptApi.get_transcript(video_id, languages=['en', 'en-US', 'en-GB'])
            return {
                'success': True,
                'transcript': transcript_data,
                'language': 'en',
                'type': 'direct',
                'video_id': video_id
            }
        except NoTranscriptFound:
            pass
        
        # Try with language list approach
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        
        # Try to find manually created English transcript first
        try:
            transcript = transcript_list.find_transcript(['en', 'en-US', 'en-GB'])
            transcript_data = transcript.fetch()
            return {
                'success': True,
                'transcript': transcript_data,
                'language': transcript.language_code,
                'type': 'manual' if not transcript.is_generated else 'generated',
                'video_id': video_id
            }
        except NoTranscriptFound:
            pass
        
        # Try auto-generated English transcript
        try:
            transcript = transcript_list.find_generated_transcript(['en', 'en-US'])
            transcript_data = transcript.fetch()
            return {
                'success': True,
                'transcript': transcript_data,
                'language': transcript.language_code,
                'type': 'auto-generated',
                'video_id': video_id
            }
        except NoTranscriptFound:
            pass
        
        # Try any available transcript and translate to English
        for transcript in transcript_list:
            try:
                if transcript.language_code != 'en':
                    # Try to translate to English
                    translated = transcript.translate('en').fetch()
                    return {
                        'success': True,
                        'transcript': translated,
                        'language': 'en',
                        'type': 'translated',
                        'original_language': transcript.language_code,
                        'video_id': video_id
                    }
                else:
                    # Use the English transcript as-is
                    transcript_data = transcript.fetch()
                    return {
                        'success': True,
                        'transcript': transcript_data,
                        'language': transcript.language_code,
                        'type': 'manual' if not transcript.is_generated else 'generated',
                        'video_id': video_id
                    }
            except Exception:
                continue
        
        # If we get here, no transcripts were available
        return {
            'success': False,
            'error': 'No transcripts available for this video',
            'video_id': video_id
        }
        
    except TranscriptsDisabled:
        return {
            'success': False,
            'error': 'Transcripts are disabled for this video',
            'video_id': video_id
        }
    except Exception as e:
        return {
            'success': False,
            'error': f'Unexpected error: {str(e)}',
            'video_id': video_id
        }


def main():
    if len(sys.argv) != 2:
        result = {
            'success': False,
            'error': 'Usage: python transcript_fetcher.py <video_id>'
        }
        print(json.dumps(result))
        sys.exit(1)
    
    video_id = sys.argv[1]
    result = fetch_transcript(video_id)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()