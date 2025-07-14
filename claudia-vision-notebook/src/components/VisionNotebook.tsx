import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { invoke } from '@tauri-apps/api/core';
import { Play, Download, MessageSquare, FileText, Clock, Brain, Save, History, Youtube, Loader2, AlertCircle, CheckCircle, BookOpen } from 'lucide-react';
import { TranscriptHistory } from './TranscriptHistory';
import { YouTubeTranscript } from './YouTubeTranscript';
import { NotebookHistory } from './NotebookHistory';
import { SessionAutoSave } from './SessionAutoSave';

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

interface ManifestItem {
  t: number;
  kind: string;
  text?: string;
  path?: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
  timestamp?: number;
}

export const VisionNotebook: React.FC = () => {
  const [videoUrl, setVideoUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [manifest, setManifest] = useState<ManifestItem[]>([]);
  const [activeTab, setActiveTab] = useState('transcript');
  const [manifestPath, setManifestPath] = useState<string>('');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{question: string, answer: string, timestamp: Date}>>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [selectedQuizIndex, setSelectedQuizIndex] = useState<number | null>(null);
  const [summary, setSummary] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(0);
  const [includeFrames, setIncludeFrames] = useState(false);
  const [fps, setFps] = useState(0.5);
  const [projectDir] = useState('~/VisionNotebook');
  const [showHistory, setShowHistory] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState('vision');
  const [statusMessage, setStatusMessage] = useState<{type: 'error' | 'success' | 'warning', message: string} | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [showNotebook, setShowNotebook] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>(`vision-${Date.now()}`);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  const showStatus = (type: 'error' | 'success' | 'warning', message: string) => {
    setStatusMessage({ type, message });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleProcessVideo = async () => {
    if (!videoUrl.trim()) {
      showStatus('error', 'Please enter a YouTube URL');
      return;
    }
    
    setIsProcessing(true);
    setLoadingMessage('Processing video...');
    setStatusMessage(null);
    try {
      const result: any = await invoke('process_youtube_video', {
        url: videoUrl,
        projectDir,
        fps: includeFrames ? fps : null
      });
      
      if (result.success) {
        setVideoInfo(result.video_info);
        setTranscript(result.transcript || []);
        setManifestPath(result.manifest_path || '');
        
        // Load manifest
        if (result.manifest_path) {
          // The manifest would be loaded here in a real implementation
          // For now, we'll create a simple manifest from transcript
          const manifestItems: ManifestItem[] = (result.transcript || []).map((segment: any) => ({
            t: segment.start,
            kind: 'text',
            text: segment.text
          }));
          setManifest(manifestItems);
        }
        showStatus('success', 'Video processed successfully!');
      } else {
        showStatus('error', result.error || 'Failed to process video');
      }
    } catch (error) {
      showStatus('error', `Error processing video: ${error}`);
    } finally {
      setIsProcessing(false);
      setLoadingMessage('');
    }
  };

  const handleAskQuestion = async () => {
    if (!currentQuestion.trim() || !manifestPath) return;
    
    try {
      const answer: any = await invoke('ask_video_question', {
        question: currentQuestion,
        manifestPath,
        contextWindow: 30
      });
      
      setChatHistory(prev => [...prev, {
        question: currentQuestion,
        answer: answer as string,
        timestamp: new Date()
      }]);
      setCurrentQuestion('');
    } catch (error) {
      showStatus('error', `Error asking question: ${error}`);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!transcript.length) return;
    
    try {
      const questions: any = await invoke('generate_quiz_from_transcript', {
        transcript,
        numQuestions: 5,
        difficulty: 'medium'
      });
      
      setQuizQuestions(questions as QuizQuestion[]);
      showStatus('success', 'Quiz generated successfully!');
    } catch (error) {
      showStatus('error', `Error generating quiz: ${error}`);
    }
  };

  const handleGenerateSummary = async (type: 'brief' | 'detailed' | 'bullet_points') => {
    if (!manifestPath) return;
    
    try {
      const summaryText: any = await invoke('summarize_video', {
        manifestPath,
        summaryType: type
      });
      
      setSummary(summaryText as string);
      showStatus('success', 'Summary generated successfully!');
    } catch (error) {
      showStatus('error', `Error generating summary: ${error}`);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const jumpToTime = (time: number) => {
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleSelectHistoryItem = async (item: any) => {
    try {
      // Get full transcript details
      const details: any = await invoke('get_transcript_history_details', {
        historyId: item.id
      });
      
      // Update state with loaded data
      setVideoUrl(details.video_url);
      setVideoInfo({
        video_id: details.video_id,
        title: details.title,
        channel: details.channel,
        duration: details.duration,
        thumbnail_url: details.thumbnail_url
      });
      setTranscript(details.transcript);
      setManifestPath(details.manifest_path || '');
      
      // Close history view
      setShowHistory(false);
      setActiveTab('transcript');
      showStatus('success', 'Transcript loaded from history');
    } catch (error) {
      showStatus('error', `Failed to load transcript details: ${error}`);
    }
  };

  const handleYouTubeTranscriptLoad = (info: VideoInfo, segments: TranscriptSegment[]) => {
    setVideoInfo(info);
    setTranscript(segments);
    setActiveMainTab('vision');
    setActiveTab('transcript');
    showStatus('success', 'YouTube transcript loaded successfully!');
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Main Tabs */}
      <div className="border-b">
        <Tabs value={activeMainTab} onValueChange={setActiveMainTab}>
          <TabsList className="h-14 rounded-none w-full justify-start px-4">
            <TabsTrigger value="vision" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Vision Notebook
            </TabsTrigger>
            <TabsTrigger value="youtube" className="flex items-center gap-2">
              <Youtube className="h-4 w-4" />
              YouTube Transcripts
            </TabsTrigger>
            <TabsTrigger value="notebook" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Notebook History
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Status Message Bar */}
      {statusMessage && (
        <div className={`status-message flex items-center gap-2 px-4 py-3 ${statusMessage.type === 'error' ? 'status-error' : statusMessage.type === 'success' ? 'status-success' : 'status-warning'}`}>
          {statusMessage.type === 'error' && <AlertCircle className="h-4 w-4" />}
          {statusMessage.type === 'success' && <CheckCircle className="h-4 w-4" />}
          <span className="text-sm">{statusMessage.message}</span>
        </div>
      )}

      {/* Vision Notebook Tab */}
      {activeMainTab === 'vision' && (
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-gray-50 dark:bg-gray-900 border-b p-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2"
              >
                <History className="h-4 w-4" />
                History
              </Button>
              <div className="flex-1 flex items-center gap-2">
            <Input
              placeholder="Enter YouTube URL"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="flex-1"
            />
            <div className="flex items-center gap-2">
              <label className="text-sm">Frames:</label>
              <input
                type="checkbox"
                checked={includeFrames}
                onChange={(e) => setIncludeFrames(e.target.checked)}
              />
              {includeFrames && (
                <Select value={fps.toString()} onValueChange={(v) => setFps(parseFloat(v))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.1">0.1 fps</SelectItem>
                    <SelectItem value="0.5">0.5 fps</SelectItem>
                    <SelectItem value="1">1 fps</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <Button 
              onClick={handleProcessVideo} 
              disabled={isProcessing || !videoUrl.trim()}
              className="whitespace-nowrap"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  Process Video
                  <Download className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Loading Overlay */}
        {isProcessing && loadingMessage && (
          <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3">
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className="text-sm text-blue-700 dark:text-blue-300">{loadingMessage}</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      {showHistory ? (
        <TranscriptHistory onSelectVideo={handleSelectHistoryItem} />
      ) : (
        <div className="flex-1 flex">
          {/* Sidebar */}
          <div className="w-80 border-r bg-gray-50 p-4 space-y-4">
          {videoInfo && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{videoInfo.title}</CardTitle>
                <p className="text-xs text-gray-600">{videoInfo.channel}</p>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="flex gap-2">
                  <Badge variant="outline">
                    <Clock className="h-3 w-3 mr-1" />
                    {videoInfo.duration || 'Unknown'}
                  </Badge>
                  <Badge variant="outline">
                    <FileText className="h-3 w-3 mr-1" />
                    {transcript.length} segments
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full justify-start"
                onClick={handleGenerateQuiz}
                disabled={!transcript.length}
              >
                <Brain className="h-4 w-4 mr-2" />
                Generate Quiz
              </Button>
              
              <div className="space-y-1">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleGenerateSummary('brief')}
                  disabled={!manifestPath}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Brief Summary
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleGenerateSummary('detailed')}
                  disabled={!manifestPath}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Detailed Summary
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleGenerateSummary('bullet_points')}
                  disabled={!manifestPath}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Bullet Points
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Timeline Navigator */}
          {transcript.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-32">
                  <div className="space-y-1">
                    {transcript.slice(0, 10).map((segment, index) => (
                      <button
                        key={index}
                        onClick={() => jumpToTime(segment.start)}
                        className="w-full text-left p-2 rounded hover:bg-gray-100 text-xs"
                      >
                        <div className="font-mono text-gray-500">
                          {formatTime(segment.start)}
                        </div>
                        <div className="truncate">
                          {segment.text.substring(0, 50)}...
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Panel */}
        <div className="flex-1 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="border-b rounded-none justify-start">
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="quiz">Quiz</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="frames">Frames</TabsTrigger>
            </TabsList>

            <TabsContent value="transcript" className="flex-1 p-4">
              <ScrollArea className="h-full">
                {transcript.length > 0 ? (
                  <div className="space-y-2">
                    {transcript.map((segment, index) => (
                      <div
                        key={index}
                        className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => jumpToTime(segment.start)}
                      >
                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className="font-mono text-xs">
                            {formatTime(segment.start)}
                          </Badge>
                          <p className="text-sm flex-1">{segment.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <FileText className="h-12 w-12 mb-4 opacity-30" />
                    <p className="text-lg mb-2">No transcript loaded</p>
                    <p className="text-sm">Process a video to view transcript</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="chat" className="flex-1 flex flex-col p-4">
              {/* Auto-save indicator */}
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-gray-600">Chat with AI</h3>
                <SessionAutoSave
                  sessionId={currentSessionId}
                  sessionName={videoInfo?.title ? `Chat: ${videoInfo.title}` : 'Video Chat'}
                  projectPath={projectDir}
                  model="claude-3"
                  messages={chatHistory.map(h => ({ 
                    role: 'user' as const, 
                    content: h.question 
                  })).concat(chatHistory.map(h => ({ 
                    role: 'assistant' as const, 
                    content: h.answer 
                  }))).sort((a, b) => {
                    const indexA = chatHistory.findIndex(h => h.question === a.content || h.answer === a.content);
                    const indexB = chatHistory.findIndex(h => h.question === b.content || h.answer === b.content);
                    return indexA - indexB;
                  })}
                  isActive={activeTab === 'chat'}
                  onSaveComplete={(sessionId) => {
                    console.log('Session saved with ID:', sessionId);
                  }}
                />
              </div>
              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  {chatHistory.length > 0 ? (
                    <div className="space-y-4">
                      {chatHistory.map((item, index) => (
                        <div key={index} className="space-y-2">
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <div className="font-medium text-sm">You</div>
                            <div>{item.question}</div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="font-medium text-sm">Claude</div>
                            <div className="whitespace-pre-wrap">{item.answer}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mb-4 opacity-30" />
                      <p className="text-lg mb-2">No chat history</p>
                      <p className="text-sm">Ask a question about the video to get started</p>
                    </div>
                  )}
                </ScrollArea>
              </div>
              <div className="mt-4 flex gap-2">
                <Input
                  placeholder="Ask a question about the video..."
                  value={currentQuestion}
                  onChange={(e) => setCurrentQuestion(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion()}
                  disabled={!manifestPath}
                />
                <Button 
                  onClick={handleAskQuestion}
                  disabled={!currentQuestion.trim() || !manifestPath}
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="quiz" className="flex-1 p-4">
              {quizQuestions.length > 0 ? (
                <div className="space-y-4">
                  {quizQuestions.map((question, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="text-sm">
                          Question {index + 1}
                          {question.timestamp && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => jumpToTime(question.timestamp!)}
                              className="ml-2"
                            >
                              <Play className="h-3 w-3 mr-1" />
                              {formatTime(question.timestamp)}
                            </Button>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="mb-3">{question.question}</p>
                        <div className="space-y-2">
                          {question.options.map((option, optionIndex) => (
                            <button
                              key={optionIndex}
                              className={`w-full text-left p-2 rounded border ${
                                selectedQuizIndex === index && optionIndex === question.correct_answer
                                  ? 'bg-green-50 border-green-200'
                                  : 'hover:bg-gray-50'
                              }`}
                              onClick={() => setSelectedQuizIndex(index)}
                            >
                              {String.fromCharCode(65 + optionIndex)}. {option}
                            </button>
                          ))}
                        </div>
                        {selectedQuizIndex === index && (
                          <div className="mt-3 p-3 bg-blue-50 rounded">
                            <strong>Explanation:</strong> {question.explanation}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Brain className="h-12 w-12 mb-4 opacity-30" />
                  <p className="text-lg mb-2">No quiz generated</p>
                  <p className="text-sm">Generate quiz questions to test your knowledge</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="summary" className="flex-1 p-4">
              {summary ? (
                <div className="h-full">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium">Video Summary</h3>
                    <Button size="sm" variant="outline">
                      <Save className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                  <ScrollArea className="h-full">
                    <div className="prose prose-sm max-w-none">
                      <div className="whitespace-pre-wrap">{summary}</div>
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <FileText className="h-12 w-12 mb-4 opacity-30" />
                  <p className="text-lg mb-2">No summary available</p>
                  <p className="text-sm">Generate a summary to get key insights</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="frames" className="flex-1 p-4">
              <div className="text-center text-gray-500">
                Frame extraction feature coming soon
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      )}
    </div>
  )}

  {/* YouTube Transcript Tab */}
  {activeMainTab === 'youtube' && (
    <div className="flex-1 overflow-y-auto">
      <YouTubeTranscript onTranscriptLoad={handleYouTubeTranscriptLoad} />
    </div>
  )}
  
  {/* Notebook History Tab */}
  {activeMainTab === 'notebook' && (
    <div className="flex-1 overflow-hidden">
      <NotebookHistory 
        onSelectSession={(session) => {
          // Handle session selection
          console.log('Selected session:', session);
          setActiveMainTab('vision');
        }}
        onSelectProject={(project) => {
          // Handle project selection
          console.log('Selected project:', project);
        }}
        onSelectTranscript={(transcriptId) => {
          // Load transcript from history
          handleSelectHistoryItem({ id: transcriptId } as any);
          setActiveMainTab('vision');
        }}
      />
    </div>
  )}
</div>
);
};

export default VisionNotebook;