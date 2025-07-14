import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { 
  Search, Filter, Calendar, Clock, FolderOpen, 
  MessageSquare, BookOpen, Tag, Pin, Trash2, 
  ChevronRight, History, Star, TrendingUp, 
  FileText, Code, MoreVertical, Download, Archive
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from './ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Textarea } from './ui/textarea';

interface ClaudeSession {
  id: number;
  session_id: string;
  session_name?: string;
  project_path?: string;
  model?: string;
  messages: string;
  created_at: string;
  updated_at: string;
  tags?: string;
  summary?: string;
  token_count?: number;
  status: string;
}

interface ProjectHistory {
  id: number;
  project_path: string;
  project_name?: string;
  last_accessed: string;
  first_accessed: string;
  access_count: number;
  total_sessions: number;
  total_files_edited: number;
  pinned: boolean;
  tags?: string;
}

interface NotebookEntry {
  id: number;
  entry_type: string;
  entry_id?: number;
  title: string;
  content_preview?: string;
  created_at: string;
  updated_at: string;
  tags?: string;
  pinned: boolean;
  metadata?: string;
}

interface SearchResult {
  entry_id: number;
  entry_type: string;
  title: string;
  content_snippet: string;
  tags?: string;
  relevance_score: number;
}

interface NotebookHistoryProps {
  onSelectSession?: (session: ClaudeSession) => void;
  onSelectProject?: (project: ProjectHistory) => void;
  onSelectTranscript?: (transcriptId: number) => void;
}

export const NotebookHistory: React.FC<NotebookHistoryProps> = ({
  onSelectSession,
  onSelectProject,
  onSelectTranscript
}) => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  
  // Data states
  const [notebookEntries, setNotebookEntries] = useState<NotebookEntry[]>([]);
  const [claudeSessions, setClaudeSessions] = useState<ClaudeSession[]>([]);
  const [projects, setProjects] = useState<ProjectHistory[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<NotebookEntry | null>(null);
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [editingTags, setEditingTags] = useState('');
  
  // Load initial data
  useEffect(() => {
    loadNotebookEntries();
    if (activeTab === 'sessions') loadClaudeSessions();
    if (activeTab === 'projects') loadProjects();
  }, [activeTab, showPinnedOnly, selectedTags]);
  
  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  const loadNotebookEntries = async () => {
    setIsLoading(true);
    try {
      const entries = await invoke<NotebookEntry[]>('get_notebook_entries', {
        pinnedOnly: showPinnedOnly,
        tags: selectedTags.length > 0 ? selectedTags : null,
        limit: 50
      });
      setNotebookEntries(entries);
    } catch (error) {
      console.error('Failed to load notebook entries:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadClaudeSessions = async () => {
    try {
      const sessions = await invoke<ClaudeSession[]>('get_claude_sessions', {
        limit: 50,
        tags: selectedTags.length > 0 ? selectedTags : null
      });
      setClaudeSessions(sessions);
    } catch (error) {
      console.error('Failed to load Claude sessions:', error);
    }
  };
  
  const loadProjects = async () => {
    try {
      const projectList = await invoke<ProjectHistory[]>('get_project_history', {
        pinnedOnly: showPinnedOnly,
        limit: 50
      });
      setProjects(projectList);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };
  
  const performSearch = async () => {
    try {
      const results = await invoke<SearchResult[]>('search_notebook', {
        query: searchQuery,
        limit: 50
      });
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };
  
  const togglePin = async (entryId: number) => {
    try {
      await invoke('toggle_pin_entry', { entryId });
      loadNotebookEntries();
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };
  
  const updateTags = async (entryId: number, tags: string[]) => {
    try {
      await invoke('update_entry_tags', { entryId, tags });
      loadNotebookEntries();
      setShowTagEditor(false);
    } catch (error) {
      console.error('Failed to update tags:', error);
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    
    return date.toLocaleDateString();
  };
  
  const getEntryIcon = (type: string) => {
    switch (type) {
      case 'claude_session': return <MessageSquare className="h-4 w-4" />;
      case 'transcript': return <FileText className="h-4 w-4" />;
      case 'project': return <FolderOpen className="h-4 w-4" />;
      case 'note': return <BookOpen className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };
  
  const renderNotebookEntry = (entry: NotebookEntry) => (
    <div
      key={entry.id}
      className="notebook-entry group relative p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
      onClick={() => handleEntryClick(entry)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {getEntryIcon(entry.entry_type)}
            <h3 className="font-medium line-clamp-1">{entry.title}</h3>
            {entry.pinned && <Pin className="h-3 w-3 text-blue-500" />}
          </div>
          
          {entry.content_preview && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
              {entry.content_preview}
            </p>
          )}
          
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(entry.updated_at)}
            </span>
            
            {entry.tags && (
              <div className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                {entry.tags.split(',').map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag.trim()}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => togglePin(entry.id)}>
              <Pin className="h-4 w-4 mr-2" />
              {entry.pinned ? 'Unpin' : 'Pin'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setSelectedEntry(entry);
              setEditingTags(entry.tags || '');
              setShowTagEditor(true);
            }}>
              <Tag className="h-4 w-4 mr-2" />
              Edit Tags
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
  
  const renderClaudeSession = (session: ClaudeSession) => {
    let messageCount = 0;
    try {
      const messages = JSON.parse(session.messages);
      messageCount = Array.isArray(messages) ? messages.length : 0;
    } catch {}
    
    return (
      <Card
        key={session.id}
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => onSelectSession?.(session)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base line-clamp-1">
                {session.session_name || `Session ${session.session_id.slice(0, 8)}`}
              </CardTitle>
              {session.project_path && (
                <p className="text-xs text-gray-600 mt-1">
                  {session.project_path.split('/').pop()}
                </p>
              )}
            </div>
            <Badge variant="outline">{session.model || 'Unknown'}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {session.summary && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">
              {session.summary}
            </p>
          )}
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {messageCount} messages
              </span>
              {session.token_count && (
                <span className="flex items-center gap-1">
                  <Code className="h-3 w-3" />
                  {session.token_count.toLocaleString()} tokens
                </span>
              )}
            </div>
            <span>{formatDate(session.updated_at)}</span>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  const renderProject = (project: ProjectHistory) => (
    <Card
      key={project.id}
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onSelectProject?.(project)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              {project.project_name || project.project_path.split('/').pop()}
              {project.pinned && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
            </CardTitle>
            <p className="text-xs text-gray-600 mt-1 truncate">
              {project.project_path}
            </p>
          </div>
          <Badge variant="outline">
            <TrendingUp className="h-3 w-3 mr-1" />
            {project.access_count}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div>
            <span className="font-medium">Sessions:</span> {project.total_sessions}
          </div>
          <div>
            <span className="font-medium">Files edited:</span> {project.total_files_edited}
          </div>
          <div>
            <span className="font-medium">First accessed:</span> {formatDate(project.first_accessed)}
          </div>
          <div>
            <span className="font-medium">Last accessed:</span> {formatDate(project.last_accessed)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
  
  const handleEntryClick = (entry: NotebookEntry) => {
    switch (entry.entry_type) {
      case 'claude_session':
        if (entry.entry_id && onSelectSession) {
          const session = claudeSessions.find(s => s.id === entry.entry_id);
          if (session) onSelectSession(session);
        }
        break;
      case 'transcript':
        if (entry.entry_id && onSelectTranscript) {
          onSelectTranscript(entry.entry_id);
        }
        break;
      case 'project':
        if (entry.entry_id && onSelectProject) {
          const project = projects.find(p => p.id === entry.entry_id);
          if (project) onSelectProject(project);
        }
        break;
    }
  };
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <History className="h-5 w-5" />
            Notebook History
          </h2>
          
          <div className="flex items-center gap-2">
            <Button
              variant={showPinnedOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowPinnedOnly(!showPinnedOnly)}
            >
              <Pin className="h-4 w-4 mr-1" />
              Pinned
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-1" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>
                  <Calendar className="h-4 w-4 mr-2" />
                  Today
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Calendar className="h-4 w-4 mr-2" />
                  This Week
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Calendar className="h-4 w-4 mr-2" />
                  This Month
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive Old
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search across all notebooks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Selected Tags */}
        {selectedTags.length > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-gray-600">Tags:</span>
            {selectedTags.map(tag => (
              <Badge
                key={tag}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => setSelectedTags(selectedTags.filter(t => t !== tag))}
              >
                {tag} ×
              </Badge>
            ))}
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="mx-4 mt-4">
            <TabsTrigger value="all">All Entries</TabsTrigger>
            <TabsTrigger value="sessions">Claude Sessions</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="transcripts">Transcripts</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {searchQuery && searchResults.length > 0 ? (
                  <>
                    <h3 className="text-sm font-medium text-gray-600 mb-2">
                      Search Results ({searchResults.length})
                    </h3>
                    {searchResults.map(result => {
                      const entry = notebookEntries.find(e => e.id === result.entry_id);
                      return entry ? renderNotebookEntry(entry) : null;
                    })}
                  </>
                ) : (
                  notebookEntries.map(renderNotebookEntry)
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="sessions" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 grid gap-3">
                {claudeSessions.map(renderClaudeSession)}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="projects" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 grid gap-3">
                {projects.map(renderProject)}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="transcripts" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4">
                <p className="text-center text-gray-500">
                  Transcript history is available in the Vision Notebook
                </p>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Tag Editor Dialog */}
      <Dialog open={showTagEditor} onOpenChange={setShowTagEditor}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tags</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Enter tags separated by commas"
              value={editingTags}
              onChange={(e) => setEditingTags(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowTagEditor(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                if (selectedEntry) {
                  const tags = editingTags.split(',').map(t => t.trim()).filter(t => t);
                  updateTags(selectedEntry.id, tags);
                }
              }}>
                Save Tags
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotebookHistory;