import React, { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Save, CheckCircle, AlertCircle } from 'lucide-react';
import { Badge } from './ui/badge';

interface SessionAutoSaveProps {
  sessionId: string;
  sessionName?: string;
  projectPath?: string;
  model?: string;
  messages: any[];
  isActive: boolean;
  onSaveComplete?: (sessionId: number) => void;
}

export const SessionAutoSave: React.FC<SessionAutoSaveProps> = ({
  sessionId,
  sessionName,
  projectPath,
  model,
  messages,
  isActive,
  onSaveComplete
}) => {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessagesRef = useRef<string>('');
  
  // Auto-save effect
  useEffect(() => {
    if (!isActive || messages.length === 0) return;
    
    const messagesStr = JSON.stringify(messages);
    if (messagesStr === lastMessagesRef.current) return;
    
    lastMessagesRef.current = messagesStr;
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout for auto-save (3 seconds after last change)
    setSaveStatus('idle');
    saveTimeoutRef.current = setTimeout(() => {
      saveSession();
    }, 3000);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [messages, isActive]);
  
  // Save on unmount or when session becomes inactive
  useEffect(() => {
    return () => {
      if (messages.length > 0 && lastMessagesRef.current) {
        saveSession();
      }
    };
  }, []);
  
  useEffect(() => {
    if (!isActive && messages.length > 0) {
      saveSession();
    }
  }, [isActive]);
  
  const saveSession = async () => {
    setSaveStatus('saving');
    
    try {
      // Generate summary from last few messages
      const summary = generateSummary(messages);
      
      // Calculate approximate token count
      const tokenCount = estimateTokenCount(messages);
      
      // Extract tags from conversation
      const tags = extractTags(messages);
      
      const sessionDbId = await invoke<number>('save_claude_session', {
        sessionId,
        sessionName: sessionName || generateSessionName(messages),
        projectPath,
        model,
        messages: JSON.stringify(messages),
        tags: tags.length > 0 ? tags : null,
        summary,
        tokenCount
      });
      
      setSaveStatus('saved');
      setLastSaved(new Date());
      onSaveComplete?.(sessionDbId);
      
      // Reset status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save session:', error);
      setSaveStatus('error');
      
      // Reset status after 5 seconds
      setTimeout(() => setSaveStatus('idle'), 5000);
    }
  };
  
  const generateSummary = (messages: any[]): string => {
    if (messages.length === 0) return '';
    
    // Get the first user message and last assistant message
    const firstUserMsg = messages.find(m => m.role === 'user');
    const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
    
    if (!firstUserMsg) return '';
    
    let summary = firstUserMsg.content;
    if (typeof summary === 'string') {
      summary = summary.slice(0, 200);
      if (summary.length === 200) summary += '...';
    }
    
    return summary;
  };
  
  const generateSessionName = (messages: any[]): string => {
    const firstUserMsg = messages.find(m => m.role === 'user');
    if (!firstUserMsg || typeof firstUserMsg.content !== 'string') {
      return `Session ${new Date().toLocaleString()}`;
    }
    
    // Extract first meaningful part of the message
    let name = firstUserMsg.content.split('\n')[0].slice(0, 50);
    if (name.length === 50) name += '...';
    
    return name;
  };
  
  const estimateTokenCount = (messages: any[]): number => {
    // Rough estimation: ~4 characters per token
    const totalChars = messages.reduce((sum, msg) => {
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      return sum + content.length;
    }, 0);
    
    return Math.round(totalChars / 4);
  };
  
  const extractTags = (messages: any[]): string[] => {
    const tags = new Set<string>();
    
    // Extract programming languages, frameworks, and key concepts
    const patterns = [
      /\b(javascript|typescript|python|rust|go|java|c\+\+|ruby|php)\b/gi,
      /\b(react|vue|angular|svelte|nextjs|express|django|flask|rails)\b/gi,
      /\b(api|database|frontend|backend|fullstack|mobile|desktop)\b/gi,
      /\b(bug|feature|refactor|optimization|testing|deployment)\b/gi
    ];
    
    messages.forEach(msg => {
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      patterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          matches.forEach(match => tags.add(match.toLowerCase()));
        }
      });
    });
    
    return Array.from(tags).slice(0, 5); // Limit to 5 tags
  };
  
  const formatLastSaved = (): string => {
    if (!lastSaved) return 'Not saved';
    
    const now = new Date();
    const diff = now.getTime() - lastSaved.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return lastSaved.toLocaleTimeString();
  };
  
  return (
    <div className="flex items-center gap-2 text-sm">
      {saveStatus === 'idle' && lastSaved && (
        <span className="text-gray-500">
          Saved {formatLastSaved()}
        </span>
      )}
      
      {saveStatus === 'saving' && (
        <Badge variant="outline" className="animate-pulse">
          <Save className="h-3 w-3 mr-1" />
          Saving...
        </Badge>
      )}
      
      {saveStatus === 'saved' && (
        <Badge variant="outline" className="text-green-600">
          <CheckCircle className="h-3 w-3 mr-1" />
          Saved
        </Badge>
      )}
      
      {saveStatus === 'error' && (
        <Badge variant="outline" className="text-red-600">
          <AlertCircle className="h-3 w-3 mr-1" />
          Save failed
        </Badge>
      )}
    </div>
  );
};

export default SessionAutoSave;