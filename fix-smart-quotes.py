#!/usr/bin/env python3
import re
import sys

def fix_smart_quotes(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace smart quotes with regular quotes
    content = content.replace('"', '"')  # Left double quote
    content = content.replace('"', '"')  # Right double quote
    content = content.replace(''', "'")  # Left single quote
    content = content.replace(''', "'")  # Right single quote
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Fixed smart quotes in {file_path}")

if __name__ == "__main__":
    file_path = "/Users/tradesdontlie/youtube transcript app/claudia-vision-notebook/src-tauri/src/commands/vision_notebook.rs"
    fix_smart_quotes(file_path)