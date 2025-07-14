#!/usr/bin/env python3
import sys
import json
import argparse

# Hardcode the working path
sys.path.insert(0, '/Users/tradesdontlie/youtube transcript app/python_env/lib/python3.13/site-packages')

try:
    from youtube_transcript_api import YouTubeTranscriptApi
    from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound, VideoUnavailable
except ImportError as e:
    print(json.dumps({
        "success": False,
        "error": f"Import failed: {str(e)}",
        "error_type": "import_error"
    }))
    sys.exit(1)

def fetch_transcript(video_id, languages=None):
    if languages is None:
        languages = ['en', 'en-US', 'en-GB']
    
    try:
        # Get available transcripts
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        
        # Get available transcript info
        available = []
        for t in transcript_list:
            available.append({
                "language": t.language,
                "language_code": t.language_code,
                "is_generated": t.is_generated
            })
        
        # Try to fetch transcript in preferred language
        transcript = None
        used_language = None
        
        for lang in languages:
            try:
                transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=[lang])
                used_language = lang
                break
            except NoTranscriptFound:
                continue
        
        # If no preferred language found, try any English
        if not transcript:
            try:
                transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=['en'])
                used_language = 'en'
            except NoTranscriptFound:
                pass
        
        # If still no transcript, try auto-generated
        if not transcript:
            try:
                transcript = YouTubeTranscriptApi.get_transcript(video_id)
                used_language = 'auto'
            except:
                pass
        
        if transcript:
            return {
                "success": True,
                "transcript": transcript,
                "metadata": {
                    "video_id": video_id,
                    "language_used": used_language,
                    "total_segments": len(transcript),
                    "available_transcripts": available
                }
            }
        else:
            return {
                "success": False,
                "error": "No suitable transcript found",
                "error_type": "no_transcript",
                "available_transcripts": available
            }
            
    except TranscriptsDisabled:
        return {
            "success": False,
            "error": "Transcripts are disabled for this video",
            "error_type": "transcripts_disabled"
        }
    except VideoUnavailable:
        return {
            "success": False,
            "error": "Video is unavailable",
            "error_type": "video_unavailable"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "error_type": "unknown_error"
        }

def list_transcripts(video_id):
    try:
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        available = []
        for t in transcript_list:
            available.append({
                "language": t.language,
                "language_code": t.language_code,
                "is_generated": t.is_generated,
                "is_translatable": t.is_translatable
            })
        
        return {
            "success": True,
            "video_id": video_id,
            "available_transcripts": available
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "video_id": video_id
        }

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("video_id", help="YouTube video ID")
    parser.add_argument("--list-only", action="store_true", help="Only list available transcripts")
    parser.add_argument("--languages", nargs="*", default=["en", "en-US"], help="Preferred languages")
    
    args = parser.parse_args()
    
    if args.list_only:
        result = list_transcripts(args.video_id)
    else:
        result = fetch_transcript(args.video_id, args.languages)
    
    print(json.dumps(result, ensure_ascii=False))