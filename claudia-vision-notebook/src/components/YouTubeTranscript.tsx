import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { invoke } from '@tauri-apps/api/core';
import { 
  Download, 
  Search, 
  Clock, 
  FileText, 
  Play, 
  Trash2, 
  Youtube,
  AlertCircle,
  CheckCircle,
  Loader2,
  MessageSquare,
  Brain,
  Save,
  History as HistoryIcon
} from 'lucide-react';
import { TranscriptSegment } from './TranscriptSegment';

interface VideoInfo {
  video_id: string;
  title: string;
  channel: string;
  duration?: string;
  thumbnail_url?: string;
}

interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

interface TranscriptHistoryItem {
  id: number;
  video_id: string;
  video_url: string;
  title: string;
  channel: string;
  duration?: string;
  thumbnail_url?: string;
  transcript_length: number;
  transcript_preview: string;
  fetched_at: string;
}

interface YouTubeTranscriptProps {
  onTranscriptLoad?: (videoInfo: VideoInfo, transcript: TranscriptSegment[]) => void;
}

export const YouTubeTranscript: React.FC<YouTubeTranscriptProps> = ({ onTranscriptLoad }) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TranscriptHistoryItem[]>([]);
  const [historyItems, setHistoryItems] = useState<TranscriptHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{type: 'error' | 'success' | 'warning', message: string} | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const items: TranscriptHistoryItem[] = await invoke('get_youtube_transcript_history', {
        limit: 20,
        offset: 0
      });
      setHistoryItems(items);
    } catch (error) {
      console.error('Failed to load transcript history:', error);
    }
  };

  const fetchTranscript = async () => {
    if (!videoUrl.trim()) {
      showStatus('error', 'Please enter a YouTube URL');
      return;
    }

    setIsProcessing(true);
    setLoadingMessage('Fetching transcript from YouTube...');
    setStatusMessage(null);

    try {
      const result: any = await invoke('fetch_youtube_transcript', {
        url: videoUrl
      });

      if (result.success) {
        setVideoInfo(result.video_info);
        setTranscript(result.transcript || []);
        showStatus('success', 'Transcript fetched successfully!');
        setVideoUrl('');
        
        // Notify parent component
        if (onTranscriptLoad) {
          onTranscriptLoad(result.video_info, result.transcript || []);
        }

        // Reload history
        await loadHistory();
      } else {
        showStatus('error', result.error || 'Failed to fetch transcript');
      }
    } catch (error) {
      showStatus('error', `Error: ${error}`);
    } finally {
      setIsProcessing(false);
      setLoadingMessage('');
    }
  };

  const searchTranscripts = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setLoadingMessage('Searching transcripts...');

    try {
      const results: TranscriptHistoryItem[] = await invoke('search_youtube_transcripts', {
        query: searchQuery
      });
      setSearchResults(results);
    } catch (error) {
      showStatus('error', `Search error: ${error}`);
    } finally {
      setIsSearching(false);
      setLoadingMessage('');
    }
  };

  const deleteTranscript = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this transcript?')) {
      return;
    }

    try {
      await invoke('delete_youtube_transcript', { transcriptId: id });
      showStatus('success', 'Transcript deleted successfully');
      await loadHistory();
      
      // Remove from search results if present
      setSearchResults(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      showStatus('error', `Failed to delete transcript: ${error}`);
    }
  };

  const loadTranscriptFromHistory = async (item: TranscriptHistoryItem) => {
    try {
      const details: any = await invoke('get_youtube_transcript_details', {
        transcriptId: item.id
      });

      setVideoInfo({
        video_id: details.video_id,
        title: details.title,
        channel: details.channel,
        duration: details.duration,
        thumbnail_url: details.thumbnail_url
      });
      setTranscript(details.transcript);
      setShowHistory(false);

      // Notify parent component
      if (onTranscriptLoad) {
        onTranscriptLoad(
          {
            video_id: details.video_id,
            title: details.title,
            channel: details.channel,
            duration: details.duration,
            thumbnail_url: details.thumbnail_url
          },
          details.transcript
        );
      }
    } catch (error) {
      showStatus('error', `Failed to load transcript: ${error}`);
    }
  };

  const showStatus = (type: 'error' | 'success' | 'warning', message: string) => {
    setStatusMessage({ type, message });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    return date.toLocaleDateString();
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <span key={index} className="search-highlight">{part}</span>
        : part
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="youtube-gradient text-white border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <Youtube className="h-8 w-8" />
            YouTube Transcript Manager
          </CardTitle>
          <p className="text-white/90 mt-2">Extract, save, and search YouTube video transcripts</p>
        </CardHeader>
      </Card>

      {/* Fetch New Transcript */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-red-500" />
            Fetch New Transcript
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="https://www.youtube.com/watch?v=..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchTranscript()}
                disabled={isProcessing}
                className="flex-1"
              />
              <Button 
                onClick={fetchTranscript} 
                disabled={isProcessing || !videoUrl.trim()}
                className="bg-red-600 hover:bg-red-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Fetch Transcript
                  </>
                )}
              </Button>
            </div>

            {/* Loading Indicator */}
            {isProcessing && loadingMessage && (
              <div className="flex items-center gap-3 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <div className="spinner" />
                <span className="text-sm">{loadingMessage}</span>
              </div>
            )}

            {/* Status Message */}
            {statusMessage && (
              <div className={`status-message flex items-center gap-2 p-4 rounded-lg ${
                statusMessage.type === 'error' ? 'status-error' : 
                statusMessage.type === 'success' ? 'status-success' : 
                'status-warning'
              }`}>
                {statusMessage.type === 'error' && <AlertCircle className="h-5 w-5" />}
                {statusMessage.type === 'success' && <CheckCircle className="h-5 w-5" />}
                <span>{statusMessage.message}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search and History */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-red-500" />
              Search Transcripts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter keywords to search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchTranscripts()}
                  disabled={isSearching}
                  className="flex-1"
                />
                <Button 
                  onClick={searchTranscripts}
                  disabled={isSearching || !searchQuery.trim()}
                  variant="outline"
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => loadTranscriptFromHistory(result)}
                    >
                      <h4 className="font-medium text-sm line-clamp-1">{result.title}</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {highlightText(result.transcript_preview, searchQuery)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <HistoryIcon className="h-5 w-5 text-red-500" />
                Quick Actions
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
              >
                {showHistory ? 'Hide' : 'Show'} History
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                disabled={!transcript.length}
              >
                <Brain className="h-4 w-4 mr-2" />
                Generate Summary
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                disabled={!transcript.length}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Ask Questions
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                disabled={!transcript.length}
              >
                <Save className="h-4 w-4 mr-2" />
                Export Transcript
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Transcript */}
      {videoInfo && transcript.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg">{videoInfo.title}</CardTitle>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Youtube className="h-4 w-4" />
                    {videoInfo.channel}
                  </span>
                  {videoInfo.duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {videoInfo.duration}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    {transcript.length} segments
                  </span>
                </div>
              </div>
              {videoInfo.thumbnail_url && (
                <img 
                  src={videoInfo.thumbnail_url} 
                  alt={videoInfo.title}
                  className="w-32 h-18 object-cover rounded-lg ml-4"
                />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-2 pr-4">
                {transcript.map((segment, index) => (
                  <TranscriptSegment
                    key={index}
                    text={segment.text}
                    start={segment.start}
                    duration={segment.duration}
                    isSelected={selectedSegment === index}
                    onClick={() => setSelectedSegment(index)}
                  />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Transcript History */}
      {showHistory && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HistoryIcon className="h-5 w-5 text-red-500" />
              Transcript History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-3 pr-4">
                {historyItems.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No transcript history yet</p>
                    <p className="text-sm mt-2">Start by fetching a YouTube video transcript</p>
                  </div>
                ) : (
                  historyItems.map((item) => (
                    <div
                      key={item.id}
                      className="transcript-item-hover relative p-4 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                      onClick={() => loadTranscriptFromHistory(item)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 pr-2">
                          <h3 className="font-medium line-clamp-2">{item.title}</h3>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-600 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <Youtube className="h-3 w-3" />
                              {item.channel}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(item.fetched_at)}
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {item.transcript_length} segments
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                            "{item.transcript_preview}..."
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                          onClick={(e) => deleteTranscript(item.id, e)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {item.thumbnail_url && (
                        <img 
                          src={item.thumbnail_url} 
                          alt={item.title}
                          className="youtube-thumbnail mt-3"
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default YouTubeTranscript;