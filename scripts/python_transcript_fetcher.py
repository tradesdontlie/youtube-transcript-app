#!/usr/bin/env python3
"""
YouTube Transcript Fetcher using youtube-transcript-api
High reliability Python script for extracting YouTube transcripts
"""

import sys
import os
import json
import argparse
from typing import Dict, List, Optional, Any
import traceback

# Virtual environment should handle path automatically

try:
    from youtube_transcript_api import YouTubeTranscriptApi
    from youtube_transcript_api._errors import (
        TranscriptsDisabled, 
        NoTranscriptFound, 
        VideoUnavailable,
        TooManyRequests,
        YouTubeRequestFailed
    )
except ImportError:
    print(json.dumps({
        "success": False,
        "error": "youtube-transcript-api not installed. Please run: pip install youtube-transcript-api",
        "error_type": "dependency_missing"
    }))
    sys.exit(1)


class YouTubeTranscriptFetcher:
    """High-reliability YouTube transcript fetcher using youtube-transcript-api"""
    
    def __init__(self):
        self.preferred_languages = ['en', 'en-US', 'en-GB', 'en-CA', 'en-AU']
        self.fallback_languages = ['auto', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh', 'ru']
    
    def fetch_transcript(self, video_id: str, language_preferences: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Fetch transcript for a YouTube video with comprehensive error handling
        
        Args:
            video_id: YouTube video ID
            language_preferences: Optional list of preferred languages
            
        Returns:
            Dictionary with success status, transcript data, or error information
        """
        try:
            # Use provided language preferences or defaults
            languages = language_preferences or self.preferred_languages
            
            # First, try to get available transcripts
            try:
                transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            except TranscriptsDisabled:
                return {
                    "success": False,
                    "error": "Transcripts are disabled for this video",
                    "error_type": "transcripts_disabled",
                    "video_id": video_id
                }
            except NoTranscriptFound:
                return {
                    "success": False,
                    "error": "No transcripts found for this video",
                    "error_type": "no_transcript_found",
                    "video_id": video_id
                }
            except VideoUnavailable:
                return {
                    "success": False,
                    "error": "Video is unavailable or private",
                    "error_type": "video_unavailable",
                    "video_id": video_id
                }
            except TooManyRequests:
                return {
                    "success": False,
                    "error": "Too many requests to YouTube API. Please try again later",
                    "error_type": "rate_limited",
                    "video_id": video_id
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": f"Failed to list transcripts: {str(e)}",
                    "error_type": "api_error",
                    "video_id": video_id
                }
            
            # Get available transcript information
            available_transcripts = []
            for transcript in transcript_list:
                available_transcripts.append({
                    "language": transcript.language,
                    "language_code": transcript.language_code,
                    "is_generated": transcript.is_generated,
                    "is_translatable": transcript.is_translatable
                })
            
            # Try to find and fetch the best available transcript
            transcript_data = self._fetch_best_transcript(transcript_list, languages)
            
            if transcript_data:
                return {
                    "success": True,
                    "transcript": transcript_data["transcript"],
                    "metadata": {
                        "video_id": video_id,
                        "language": transcript_data["language"],
                        "language_code": transcript_data["language_code"],
                        "is_generated": transcript_data["is_generated"],
                        "total_segments": len(transcript_data["transcript"]),
                        "available_transcripts": available_transcripts
                    }
                }
            else:
                return {
                    "success": False,
                    "error": "No suitable transcript found in preferred languages",
                    "error_type": "no_suitable_transcript",
                    "video_id": video_id,
                    "available_transcripts": available_transcripts
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Unexpected error: {str(e)}",
                "error_type": "unexpected_error",
                "video_id": video_id,
                "traceback": traceback.format_exc()
            }
    
    def _fetch_best_transcript(self, transcript_list, language_preferences: List[str]) -> Optional[Dict[str, Any]]:
        """
        Find and fetch the best available transcript based on language preferences
        
        Args:
            transcript_list: YouTubeTranscriptApi transcript list
            language_preferences: List of preferred language codes
            
        Returns:
            Dictionary with transcript data and metadata, or None if no suitable transcript found
        """
        # First, try exact language matches
        for lang in language_preferences:
            try:
                transcript = transcript_list.find_transcript([lang])
                transcript_data = transcript.fetch()
                return {
                    "transcript": transcript_data,
                    "language": transcript.language,
                    "language_code": transcript.language_code,
                    "is_generated": transcript.is_generated
                }
            except NoTranscriptFound:
                continue
            except Exception as e:
                print(f"Error fetching transcript for language {lang}: {str(e)}", file=sys.stderr)
                continue
        
        # If no exact matches, try generated transcripts
        try:
            transcript = transcript_list.find_generated_transcript(language_preferences)
            transcript_data = transcript.fetch()
            return {
                "transcript": transcript_data,
                "language": transcript.language,
                "language_code": transcript.language_code,
                "is_generated": transcript.is_generated
            }
        except NoTranscriptFound:
            pass
        except Exception as e:
            print(f"Error fetching generated transcript: {str(e)}", file=sys.stderr)
        
        # Try fallback languages
        for lang in self.fallback_languages:
            try:
                transcript = transcript_list.find_transcript([lang])
                transcript_data = transcript.fetch()
                return {
                    "transcript": transcript_data,
                    "language": transcript.language,
                    "language_code": transcript.language_code,
                    "is_generated": transcript.is_generated
                }
            except NoTranscriptFound:
                continue
            except Exception as e:
                print(f"Error fetching fallback transcript for language {lang}: {str(e)}", file=sys.stderr)
                continue
        
        # Last resort: try to get any available transcript
        try:
            for transcript in transcript_list:
                try:
                    transcript_data = transcript.fetch()
                    return {
                        "transcript": transcript_data,
                        "language": transcript.language,
                        "language_code": transcript.language_code,
                        "is_generated": transcript.is_generated
                    }
                except Exception as e:
                    print(f"Error fetching transcript {transcript.language_code}: {str(e)}", file=sys.stderr)
                    continue
        except Exception as e:
            print(f"Error iterating transcripts: {str(e)}", file=sys.stderr)
        
        return None
    
    def get_available_transcripts(self, video_id: str) -> Dict[str, Any]:
        """
        Get list of available transcripts for a video without fetching content
        
        Args:
            video_id: YouTube video ID
            
        Returns:
            Dictionary with available transcript information
        """
        try:
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            
            available_transcripts = []
            for transcript in transcript_list:
                available_transcripts.append({
                    "language": transcript.language,
                    "language_code": transcript.language_code,
                    "is_generated": transcript.is_generated,
                    "is_translatable": transcript.is_translatable
                })
            
            return {
                "success": True,
                "video_id": video_id,
                "available_transcripts": available_transcripts
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "video_id": video_id
            }


def main():
    """Main function for command-line usage"""
    parser = argparse.ArgumentParser(description='Fetch YouTube transcript using youtube-transcript-api')
    parser.add_argument('video_id', help='YouTube video ID')
    parser.add_argument('--languages', nargs='*', default=['en', 'en-US'], 
                       help='Preferred languages (default: en en-US)')
    parser.add_argument('--list-only', action='store_true', 
                       help='Only list available transcripts, don\'t fetch content')
    parser.add_argument('--format', choices=['json', 'text'], default='json',
                       help='Output format (default: json)')
    
    args = parser.parse_args()
    
    fetcher = YouTubeTranscriptFetcher()
    
    if args.list_only:
        result = fetcher.get_available_transcripts(args.video_id)
    else:
        result = fetcher.fetch_transcript(args.video_id, args.languages)
    
    if args.format == 'json':
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        # Text format for human reading
        if result.get('success'):
            if 'transcript' in result:
                for segment in result['transcript']:
                    print(f"[{segment['start']:.2f}s] {segment['text']}")
            else:
                print("Available transcripts:")
                for transcript in result.get('available_transcripts', []):
                    status = "Generated" if transcript['is_generated'] else "Manual"
                    print(f"  - {transcript['language']} ({transcript['language_code']}) - {status}")
        else:
            print(f"Error: {result.get('error', 'Unknown error')}")


if __name__ == '__main__':
    main()