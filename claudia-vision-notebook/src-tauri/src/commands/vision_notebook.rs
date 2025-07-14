use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Command;
use tauri::{command, AppHandle, Manager, State};
use crate::commands::agents::AgentDb;
use rusqlite::params;

#[derive(Debug, Serialize, Deserialize)]
pub struct VideoInfo {
    pub video_id: String,
    pub title: String,
    pub channel: String,
    pub duration: Option<String>,
    pub thumbnail_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TranscriptSegment {
    pub text: String,
    pub start: f64,
    pub duration: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ManifestItem {
    pub t: f64,
    pub kind: String, // "text" or "image"
    pub text: Option<String>,
    pub path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QuizQuestion {
    pub question: String,
    pub options: Vec<String>,
    pub correct_answer: usize,
    pub explanation: String,
    pub timestamp: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProcessVideoResult {
    pub success: bool,
    pub video_info: Option<VideoInfo>,
    pub transcript: Option<Vec<TranscriptSegment>>,
    pub manifest_path: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TranscriptHistoryItem {
    pub id: i64,
    pub video_id: String,
    pub video_url: String,
    pub title: String,
    pub channel: String,
    pub duration: Option<String>,
    pub thumbnail_url: Option<String>,
    pub transcript_length: i64,
    pub transcript_preview: String,
    pub manifest_path: Option<String>,
    pub fetched_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TranscriptHistoryDetails {
    pub id: i64,
    pub video_id: String,
    pub video_url: String,
    pub title: String,
    pub channel: String,
    pub duration: Option<String>,
    pub thumbnail_url: Option<String>,
    pub transcript: Vec<TranscriptSegment>,
    pub manifest_path: Option<String>,
    pub fetched_at: String,
}

/// Extract video ID from YouTube URL
#[command]
pub async fn extract_video_id(url: String) -> Result<String, String> {
    let regex = regex::Regex::new(r#"(?:youtube\.com/(?:[^/]+/.+/|(?:v|e(?:mbed)?)/|.*[?&]v=)|youtu\.be/)([^"&?/\s]{11})"#)
        .map_err(|e| format!("Regex error: {}", e))?;
    
    match regex.captures(&url) {
        Some(caps) => Ok(caps[1].to_string()),
        None => Err("Invalid YouTube URL".to_string()),
    }
}

/// Process a YouTube video: download, extract transcript, sample frames
#[command]
pub async fn process_youtube_video(
    db: State<'_, AgentDb>,
    url: String,
    project_dir: String,
    fps: Option<f64>,
) -> Result<ProcessVideoResult, String> {
    let video_id = extract_video_id(url.clone()).await?;
    
    // Create project directory for this video
    let video_dir = PathBuf::from(&project_dir).join(&video_id);
    std::fs::create_dir_all(&video_dir)
        .map_err(|e| format!("Failed to create video directory: {}", e))?;

    // Step 1: Download video info and transcript using existing Node.js service
    let transcript_result = call_transcript_service(&video_id, &project_dir).await?;
    
    // Step 2: Download video (optional, for frame extraction)
    let video_path = if fps.is_some() {
        Some(download_video(&video_id, &video_dir).await?)
    } else {
        None
    };
    
    // Step 3: Extract frames if video was downloaded
    let frame_paths = if let (Some(video_path), Some(fps_val)) = (&video_path, fps) {
        extract_frames(&video_path, &video_dir, fps_val).await?
    } else {
        Vec::new()
    };
    
    // Step 4: Build manifest
    let manifest = build_manifest(&transcript_result.transcript, &frame_paths).await?;
    let manifest_path = video_dir.join("manifest.json");
    
    let manifest_json = serde_json::to_string_pretty(&manifest)
        .map_err(|e| format!("Failed to serialize manifest: {}", e))?;
    
    std::fs::write(&manifest_path, manifest_json)
        .map_err(|e| format!("Failed to save manifest: {}", e))?;

    // Save to transcript history
    if let Some(ref transcript) = transcript_result.transcript {
        // Store transcript as JSON to preserve timing information
        let transcript_json = serde_json::to_string(&transcript)
            .map_err(|e| format!("Failed to serialize transcript: {}", e))?;
        
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        
        // Use INSERT OR REPLACE to update existing entries
        conn.execute(
            "INSERT OR REPLACE INTO transcript_history 
            (video_id, video_url, title, channel, duration, thumbnail_url, 
             transcript_length, transcript_text, manifest_path)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                &video_id,
                &url,
                &transcript_result.video_info.title,
                &transcript_result.video_info.channel,
                &transcript_result.video_info.duration,
                &transcript_result.video_info.thumbnail_url,
                transcript.len() as i64,
                &transcript_json,
                manifest_path.to_string_lossy().to_string()
            ],
        ).map_err(|e| format!("Failed to save transcript history: {}", e))?;
    }

    Ok(ProcessVideoResult {
        success: true,
        video_info: Some(transcript_result.video_info),
        transcript: transcript_result.transcript,
        manifest_path: Some(manifest_path.to_string_lossy().to_string()),
        error: None,
    })
}

/// Generate quiz questions from transcript using Claude CLI
#[command]
pub async fn generate_quiz_from_transcript(
    transcript: Vec<TranscriptSegment>,
    num_questions: Option<usize>,
    difficulty: Option<String>,
) -> Result<Vec<QuizQuestion>, String> {
    let num_q = num_questions.unwrap_or(5);
    let diff = difficulty.unwrap_or_else(|| "medium".to_string());
    
    // Combine transcript into text chunks (respecting token limits)
    let text_chunks = chunk_transcript(&transcript, 40000)?; // ~50k tokens max
    
    let mut all_questions = Vec::new();
    
    for chunk in text_chunks {
        let prompt = format!(
            "Based on the following transcript excerpt, generate {} {} difficulty multiple choice questions. 
            For each question provide: question text, 4 answer options, correct answer index (0-3), 
            and a brief explanation. Format as JSON array.
            
            Transcript:
            {}",
            num_q, diff, chunk.text
        );
        
        // Call Claude CLI
        let claude_output = call_claude_cli(&prompt, None).await?;
        
        // Parse JSON response
        let questions: Vec<QuizQuestion> = serde_json::from_str(&claude_output)
            .map_err(|e| format!("Failed to parse Claude response: {}", e))?;
        
        all_questions.extend(questions);
    }
    
    // Limit to requested number of questions
    all_questions.truncate(num_q);
    Ok(all_questions)
}

/// Ask Claude a question about the video using transcript and frames
#[command]
pub async fn ask_video_question(
    question: String,
    manifest_path: String,
    context_window: Option<f64>, // seconds around current timestamp
) -> Result<String, String> {
    // Load manifest
    let manifest_content = std::fs::read_to_string(&manifest_path)
        .map_err(|e| format!("Failed to read manifest: {}", e))?;
    
    let manifest: Vec<ManifestItem> = serde_json::from_str(&manifest_content)
        .map_err(|e| format!("Failed to parse manifest: {}", e))?;
    
    // Build context from manifest (transcript + relevant frames)
    let context = build_context_from_manifest(&manifest, context_window.unwrap_or(30.0))?;
    
    let prompt = format!(
        "Based on the following video content (transcript and frame descriptions), answer this question: {}
        
        Video Content:
        {}",
        question, context
    );
    
    // Call Claude CLI with multimodal support if frames are present
    let image_paths: Vec<String> = manifest.iter()
        .filter(|item| item.kind == "image")
        .filter_map(|item| item.path.clone())
        .collect();
    
    let response = call_claude_cli(&prompt, if image_paths.is_empty() { None } else { Some(image_paths) }).await?;
    
    Ok(response)
}

/// Summarize video content using Claude CLI
#[command]
pub async fn summarize_video(
    manifest_path: String,
    summary_type: Option<String>, // "brief", "detailed", "bullet_points"
) -> Result<String, String> {
    let summary_style = summary_type.unwrap_or_else(|| "detailed".to_string());
    
    // Load manifest
    let manifest_content = std::fs::read_to_string(&manifest_path)
        .map_err(|e| format!("Failed to read manifest: {}", e))?;
    
    let manifest: Vec<ManifestItem> = serde_json::from_str(&manifest_content)
        .map_err(|e| format!("Failed to parse manifest: {}", e))?;
    
    // Extract transcript text
    let transcript_text: String = manifest.iter()
        .filter(|item| item.kind == "text")
        .filter_map(|item| item.text.as_ref())
        .cloned()
        .collect::<Vec<String>>()
        .join(" ");
    
    let prompt = format!(
        "Please provide a {} summary of the following video transcript:
        
        {}",
        summary_style, transcript_text
    );
    
    call_claude_cli(&prompt, None).await
}

// Helper functions

#[derive(Deserialize)]
struct TranscriptServiceResult {
    video_info: VideoInfo,
    transcript: Option<Vec<TranscriptSegment>>,
}

async fn call_transcript_service(video_id: &str, _project_dir: &str) -> Result<TranscriptServiceResult, String> {
    let bridge_script = std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?
        .join("scripts")
        .join("clean-bridge.js");
    
    let output = Command::new("node")
        .arg(&bridge_script)
        .arg("fetch")
        .arg(video_id)
        .output()
        .map_err(|e| format!("Failed to execute transcript bridge: {}", e))?;
    
    if !output.status.success() {
        return Err(format!("Transcript service failed: {}", String::from_utf8_lossy(&output.stderr)));
    }
    
    let result_str = String::from_utf8_lossy(&output.stdout);
    let result: serde_json::Value = serde_json::from_str(&result_str)
        .map_err(|e| format!("Failed to parse transcript service response: {}", e))?;
    
    if !result["success"].as_bool().unwrap_or(false) {
        return Err(result["error"].as_str().unwrap_or("Unknown error").to_string());
    }
    
    // Convert to our format
    let transcript = if let Some(transcript_array) = result["transcript"].as_array() {
        Some(transcript_array.iter()
            .map(|item| TranscriptSegment {
                text: item["text"].as_str().unwrap_or("").to_string(),
                start: item["start"].as_f64().unwrap_or(0.0),
                duration: item["duration"].as_f64().unwrap_or(4.0),
            })
            .collect())
    } else {
        None
    };
    
    let video_info_json = &result["video_info"];
    
    Ok(TranscriptServiceResult {
        video_info: VideoInfo {
            video_id: video_info_json["video_id"].as_str().unwrap_or(video_id).to_string(),
            title: video_info_json["title"].as_str().unwrap_or("Unknown Title").to_string(),
            channel: video_info_json["channel"].as_str().unwrap_or("Unknown Channel").to_string(),
            duration: video_info_json["duration"].as_str().map(|s| s.to_string()),
            thumbnail_url: Some(format!("https://img.youtube.com/vi/{}/maxresdefault.jpg", video_id)),
        },
        transcript,
    })
}

async fn download_video(video_id: &str, video_dir: &PathBuf) -> Result<PathBuf, String> {
    let output_path = video_dir.join(format!("{}.mp4", video_id));
    
    let output = Command::new("yt-dlp")
        .arg("-f")
        .arg("best[height<=720]") // Limit quality for performance
        .arg("-o")
        .arg(&output_path)
        .arg(&format!("https://www.youtube.com/watch?v={}", video_id))
        .output()
        .map_err(|e| format!("Failed to execute yt-dlp: {}", e))?;
    
    if !output.status.success() {
        return Err(format!("yt-dlp failed: {}", String::from_utf8_lossy(&output.stderr)));
    }
    
    Ok(output_path)
}

async fn extract_frames(video_path: &PathBuf, output_dir: &PathBuf, fps: f64) -> Result<Vec<PathBuf>, String> {
    let frames_dir = output_dir.join("frames");
    std::fs::create_dir_all(&frames_dir)
        .map_err(|e| format!("Failed to create frames directory: {}", e))?;
    
    let output_pattern = frames_dir.join("frame_%06d.jpg");
    
    let output = Command::new("ffmpeg")
        .arg("-i")
        .arg(video_path)
        .arg("-vf")
        .arg(&format!("fps={}", fps))
        .arg("-y")
        .arg(&output_pattern)
        .output()
        .map_err(|e| format!("Failed to execute ffmpeg: {}", e))?;
    
    if !output.status.success() {
        return Err(format!("ffmpeg failed: {}", String::from_utf8_lossy(&output.stderr)));
    }
    
    // List generated frame files
    let mut frame_paths = Vec::new();
    for entry in std::fs::read_dir(&frames_dir)
        .map_err(|e| format!("Failed to read frames directory: {}", e))?
    {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        if entry.path().extension().and_then(|s| s.to_str()) == Some("jpg") {
            frame_paths.push(entry.path());
        }
    }
    
    frame_paths.sort();
    Ok(frame_paths)
}

async fn build_manifest(transcript: &Option<Vec<TranscriptSegment>>, frame_paths: &[PathBuf]) -> Result<Vec<ManifestItem>, String> {
    let mut manifest = Vec::new();
    
    // Add transcript items
    if let Some(transcript_segments) = transcript {
        for segment in transcript_segments {
            manifest.push(ManifestItem {
                t: segment.start,
                kind: "text".to_string(),
                text: Some(segment.text.clone()),
                path: None,
            });
        }
    }
    
    // Add frame items (estimate timestamps based on fps)
    for (i, frame_path) in frame_paths.iter().enumerate() {
        let timestamp = i as f64; // TODO: Calculate actual timestamp based on fps
        manifest.push(ManifestItem {
            t: timestamp,
            kind: "image".to_string(),
            text: None,
            path: Some(frame_path.to_string_lossy().to_string()),
        });
    }
    
    // Sort by timestamp
    manifest.sort_by(|a, b| a.t.partial_cmp(&b.t).unwrap_or(std::cmp::Ordering::Equal));
    
    Ok(manifest)
}

#[derive(Debug)]
struct TranscriptChunk {
    text: String,
    start_time: f64,
    end_time: f64,
}

fn chunk_transcript(transcript: &[TranscriptSegment], max_chars: usize) -> Result<Vec<TranscriptChunk>, String> {
    
    let mut chunks = Vec::new();
    let mut current_chunk = String::new();
    let mut chunk_start = 0.0;
    let mut last_time = 0.0;
    
    for segment in transcript {
        let segment_text = format!("{} ", segment.text);
        
        if current_chunk.len() + segment_text.len() > max_chars && !current_chunk.is_empty() {
            chunks.push(TranscriptChunk {
                text: current_chunk.clone(),
                start_time: chunk_start,
                end_time: last_time,
            });
            current_chunk.clear();
            chunk_start = segment.start;
        }
        
        if current_chunk.is_empty() {
            chunk_start = segment.start;
        }
        
        current_chunk.push_str(&segment_text);
        last_time = segment.start + segment.duration;
    }
    
    if !current_chunk.is_empty() {
        chunks.push(TranscriptChunk {
            text: current_chunk,
            start_time: chunk_start,
            end_time: last_time,
        });
    }
    
    Ok(chunks)
}

fn build_context_from_manifest(manifest: &[ManifestItem], _window: f64) -> Result<String, String> {
    // For now, just return all text content
    // TODO: Implement proper windowing and frame integration
    let text_content: String = manifest.iter()
        .filter(|item| item.kind == "text")
        .filter_map(|item| item.text.as_ref())
        .cloned()
        .collect::<Vec<String>>()
        .join(" ");
    
    Ok(text_content)
}

async fn call_claude_cli(prompt: &str, image_paths: Option<Vec<String>>) -> Result<String, String> {
    let mut cmd = Command::new("claude");
    cmd.arg("-p").arg(prompt);
    
    if let Some(images) = image_paths {
        for image_path in images {
            cmd.arg("-i").arg(image_path);
        }
    }
    
    let output = cmd.output()
        .map_err(|e| format!("Failed to execute Claude CLI: {}", e))?;
    
    if !output.status.success() {
        return Err(format!("Claude CLI failed: {}", String::from_utf8_lossy(&output.stderr)));
    }
    
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

/// Get transcript history list
#[command]
pub async fn get_transcript_history(
    db: State<'_, AgentDb>,
    limit: Option<i64>,
    offset: Option<i64>,
    search: Option<String>,
) -> Result<Vec<TranscriptHistoryItem>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
    let limit = limit.unwrap_or(20);
    let offset = offset.unwrap_or(0);
    
    let query = if let Some(search_term) = search {
        format!(
            "SELECT id, video_id, video_url, title, channel, duration, thumbnail_url, 
             transcript_length, transcript_text, manifest_path, fetched_at
             FROM transcript_history
             WHERE title LIKE '%{}%' OR channel LIKE '%{}%' OR transcript_text LIKE '%{}%'
             ORDER BY fetched_at DESC
             LIMIT ? OFFSET ?",
            search_term.replace("'", "''"),
            search_term.replace("'", "''"),
            search_term.replace("'", "''")
        )
    } else {
        "SELECT id, video_id, video_url, title, channel, duration, thumbnail_url, 
         transcript_length, transcript_text, manifest_path, fetched_at
         FROM transcript_history
         ORDER BY fetched_at DESC
         LIMIT ? OFFSET ?".to_string()
    };
    
    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    
    let history_items = stmt.query_map(params![limit, offset], |row| {
        let transcript_json: String = row.get(8)?;
        
        // Parse transcript to create preview
        let transcript_preview = if let Ok(segments) = serde_json::from_str::<Vec<TranscriptSegment>>(&transcript_json) {
            segments.iter()
                .take(3)
                .map(|s| &s.text)
                .cloned()
                .collect::<Vec<String>>()
                .join(" ")
                .chars()
                .take(200)
                .collect()
        } else {
            // Fallback for old format
            transcript_json.chars().take(200).collect()
        };
        
        Ok(TranscriptHistoryItem {
            id: row.get(0)?,
            video_id: row.get(1)?,
            video_url: row.get(2)?,
            title: row.get(3)?,
            channel: row.get(4)?,
            duration: row.get(5)?,
            thumbnail_url: row.get(6)?,
            transcript_length: row.get(7)?,
            transcript_preview,
            manifest_path: row.get(9)?,
            fetched_at: row.get(10)?,
        })
    }).map_err(|e| e.to_string())?;
    
    let mut items = Vec::new();
    for item in history_items {
        items.push(item.map_err(|e| e.to_string())?);
    }
    
    Ok(items)
}

/// Get transcript history details by ID
#[command]
pub async fn get_transcript_history_details(
    db: State<'_, AgentDb>,
    history_id: i64,
) -> Result<TranscriptHistoryDetails, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare(
        "SELECT id, video_id, video_url, title, channel, duration, thumbnail_url, 
         transcript_text, manifest_path, fetched_at
         FROM transcript_history
         WHERE id = ?"
    ).map_err(|e| e.to_string())?;
    
    let row = stmt.query_row(params![history_id], |row| {
        let transcript_json: String = row.get(7)?;
        
        // Parse transcript from JSON
        let segments: Vec<TranscriptSegment> = serde_json::from_str(&transcript_json)
            .unwrap_or_else(|_| {
                // Fallback for old format
                transcript_json
                    .split(" ")
                    .enumerate()
                    .map(|(i, text)| TranscriptSegment {
                        text: text.to_string(),
                        start: i as f64 * 4.0,
                        duration: 4.0,
                    })
                    .collect()
            });
        
        Ok(TranscriptHistoryDetails {
            id: row.get(0)?,
            video_id: row.get(1)?,
            video_url: row.get(2)?,
            title: row.get(3)?,
            channel: row.get(4)?,
            duration: row.get(5)?,
            thumbnail_url: row.get(6)?,
            transcript: segments,
            manifest_path: row.get(8)?,
            fetched_at: row.get(9)?,
        })
    }).map_err(|e| format!("Failed to get transcript details: {}", e))?;
    
    Ok(row)
}

/// Delete transcript history entry
#[command]
pub async fn delete_transcript_history(
    db: State<'_, AgentDb>,
    history_id: i64,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
    conn.execute(
        "DELETE FROM transcript_history WHERE id = ?",
        params![history_id],
    ).map_err(|e| format!("Failed to delete transcript history: {}", e))?;
    
    Ok(())
}

// YouTube-specific commands for the YouTube Transcript component

/// Fetch YouTube transcript (simpler version for YouTube tab)
#[command]
pub async fn fetch_youtube_transcript(
    db: State<'_, AgentDb>,
    url: String,
) -> Result<ProcessVideoResult, String> {
    process_youtube_video(db, url, "~/VisionNotebook".to_string(), None).await
}

/// Get YouTube transcript history
#[command]
pub async fn get_youtube_transcript_history(
    db: State<'_, AgentDb>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<TranscriptHistoryItem>, String> {
    get_transcript_history(db, limit, offset, None).await
}

/// Search YouTube transcripts
#[command]
pub async fn search_youtube_transcripts(
    db: State<'_, AgentDb>,
    query: String,
) -> Result<Vec<TranscriptHistoryItem>, String> {
    get_transcript_history(db, Some(50), Some(0), Some(query)).await
}

/// Delete YouTube transcript
#[command]
pub async fn delete_youtube_transcript(
    db: State<'_, AgentDb>,
    transcript_id: i64,
) -> Result<(), String> {
    delete_transcript_history(db, transcript_id).await
}

/// Get YouTube transcript details
#[command]
pub async fn get_youtube_transcript_details(
    db: State<'_, AgentDb>,
    transcript_id: i64,
) -> Result<TranscriptHistoryDetails, String> {
    get_transcript_history_details(db, transcript_id).await
}