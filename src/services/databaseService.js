import sqlite3 from 'sqlite3';
import { promisify } from 'util';

export class DatabaseService {
  constructor() {
    this.db = new sqlite3.Database('./data/transcripts.db');
    this.run = promisify(this.db.run.bind(this.db));
    this.get = promisify(this.db.get.bind(this.db));
    this.all = promisify(this.db.all.bind(this.db));
  }

  async initialize() {
    await this.run(`
      CREATE TABLE IF NOT EXISTS transcripts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        video_id TEXT UNIQUE NOT NULL,
        title TEXT,
        channel TEXT,
        duration INTEGER,
        transcript TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await this.run(`
      CREATE INDEX IF NOT EXISTS idx_video_id ON transcripts(video_id);
    `);
    
    await this.run(`
      CREATE VIRTUAL TABLE IF NOT EXISTS transcript_search USING fts5(
        title, channel, transcript, content='transcripts', content_rowid='id'
      );
    `);
  }

  async saveTranscript(videoId, title, channel, duration, transcript) {
    const result = await this.run(
      `INSERT OR REPLACE INTO transcripts (video_id, title, channel, duration, transcript, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [videoId, title, channel, duration, transcript]
    );
    
    // Get the ID of the inserted/updated record
    const record = await this.get('SELECT id FROM transcripts WHERE video_id = ?', [videoId]);
    const recordId = record.id;
    
    await this.run(
      `INSERT OR REPLACE INTO transcript_search (rowid, title, channel, transcript)
       VALUES (?, ?, ?, ?)`,
      [recordId, title, channel, transcript]
    );
    
    return recordId;
  }

  async getTranscript(id) {
    return await this.get('SELECT * FROM transcripts WHERE id = ?', [id]);
  }

  async getTranscriptByVideoId(videoId) {
    return await this.get('SELECT * FROM transcripts WHERE video_id = ?', [videoId]);
  }

  async getAllTranscripts() {
    return await this.all('SELECT id, video_id, title, channel, duration, created_at FROM transcripts ORDER BY created_at DESC');
  }

  async searchTranscripts(query) {
    if (!query) return [];
    
    return await this.all(`
      SELECT t.id, t.video_id, t.title, t.channel, t.duration, t.created_at,
             snippet(transcript_search, 2, '<mark>', '</mark>', '...', 32) as snippet
      FROM transcript_search
      JOIN transcripts t ON transcript_search.rowid = t.id
      WHERE transcript_search MATCH ?
      ORDER BY rank
    `, [query]);
  }

  async deleteTranscript(id) {
    await this.run('DELETE FROM transcripts WHERE id = ?', [id]);
    await this.run('DELETE FROM transcript_search WHERE rowid = ?', [id]);
    return { success: true };
  }

  close() {
    this.db.close();
  }
}