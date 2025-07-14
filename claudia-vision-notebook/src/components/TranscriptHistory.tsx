import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { invoke } from '@tauri-apps/api/core';
import { BookOpen, Clock, FileText, Search, Trash2, ExternalLink, Calendar, Loader2, AlertCircle } from 'lucide-react';
import '../styles/notebook.css';

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
  manifest_path?: string;
  fetched_at: string;
}

interface TranscriptHistoryProps {
  onSelectVideo: (item: TranscriptHistoryItem) => void;
}

export const TranscriptHistory: React.FC<TranscriptHistoryProps> = ({ onSelectVideo }) => {
  const [historyItems, setHistoryItems] = useState<TranscriptHistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);

  const loadHistory = async (reset = false) => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const offset = reset ? 0 : currentPage * 20;
      const items: TranscriptHistoryItem[] = await invoke('get_transcript_history', {
        limit: 20,
        offset,
        search: searchQuery || null
      });
      
      if (reset) {
        setHistoryItems(items);
        setCurrentPage(0);
      } else {
        setHistoryItems(prev => [...prev, ...items]);
      }
      
      setHasMore(items.length === 20);
    } catch (error) {
      console.error('Failed to load transcript history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(true);
  }, [searchQuery]);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this transcript?')) {
      return;
    }
    
    setDeleteLoading(id);
    try {
      await invoke('delete_transcript_history', { historyId: id });
      setHistoryItems(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('Failed to delete transcript:', error);
    } finally {
      setDeleteLoading(null);
    }
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

  const formatDuration = (duration?: string) => {
    if (!duration) return 'Unknown';
    
    // Parse ISO 8601 duration (e.g., "PT12M34S")
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return duration;
    
    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const seconds = match[3] ? parseInt(match[3]) : 0;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Search Header */}
      <div className="p-4 border-b bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search transcripts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              disabled={isLoading}
            />
            {isLoading && searchQuery && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* History List */}
      <ScrollArea className="flex-1 notebook-container">
        <div className="p-4 space-y-3 notebook-lines">
          {isLoading && historyItems.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">Loading transcript history...</p>
              </div>
            </div>
          ) : historyItems.length === 0 && !isLoading ? (
            <div className="text-center py-12 text-gray-500">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">No transcript history yet</p>
              <p className="text-sm">Process a YouTube video to get started</p>
            </div>
          ) : (
            <>
              {historyItems.map((item) => (
                <div
                  key={item.id}
                  className="notebook-card cursor-pointer"
                  onClick={() => onSelectVideo(item)}
                >
                  <div className="notebook-date">{formatDate(item.fetched_at)}</div>
                  
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 pr-2">
                      <h3 className="notebook-title line-clamp-2">
                        {item.title}
                      </h3>
                      <p className="text-xs text-gray-600">{item.channel}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 z-10 text-red-500 hover:text-red-700"
                      onClick={(e) => handleDelete(item.id, e)}
                      disabled={deleteLoading === item.id}
                    >
                      {deleteLoading === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  <p className="notebook-preview line-clamp-3">
                    "{item.transcript_preview}..."
                  </p>
                  
                  <div className="notebook-metadata">
                    <div className="notebook-metadata-item">
                      <Clock className="h-3 w-3" />
                      <span>{formatDuration(item.duration)}</span>
                    </div>
                    <div className="notebook-metadata-item">
                      <FileText className="h-3 w-3" />
                      <span>{item.transcript_length} segments</span>
                    </div>
                  </div>
                  
                  {item.thumbnail_url && (
                    <div className="mt-3 relative overflow-hidden rounded-lg">
                      <img
                        src={item.thumbnail_url}
                        alt={item.title}
                        className="w-full h-24 object-cover opacity-80 hover:opacity-100 transition-opacity"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                    </div>
                  )}
                </div>
              ))}
              
              {hasMore && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setCurrentPage(prev => prev + 1);
                    loadHistory(false);
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </Button>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default TranscriptHistory;