#!/usr/bin/env python3
import sys
import os

print("Python executable:", sys.executable)
print("Python version:", sys.version)
print("Current working directory:", os.getcwd())
print("sys.path:", sys.path)

script_dir = os.path.dirname(os.path.abspath(__file__))
venv_path = os.path.join(script_dir, 'python_env', 'lib', 'python3.13', 'site-packages')
print(f"Computed venv path: {venv_path}")
print(f"Venv path exists: {os.path.exists(venv_path)}")

alt_venv_path = '/Users/tradesdontlie/youtube transcript app/python_env/lib/python3.13/site-packages'
print(f"Alt venv path: {alt_venv_path}")
print(f"Alt venv path exists: {os.path.exists(alt_venv_path)}")

if os.path.exists(alt_venv_path):
    sys.path.insert(0, alt_venv_path)
    print("Added alt venv path to sys.path")

try:
    import youtube_transcript_api
    print("✅ Successfully imported youtube_transcript_api")
    print(f"Module location: {youtube_transcript_api.__file__}")
except ImportError as e:
    print(f"❌ Failed to import youtube_transcript_api: {e}")