import React from 'react';
import { Badge } from './ui/badge';
import { Play, Pause } from 'lucide-react';

interface TranscriptSegmentProps {
  text: string;
  start: number;
  duration: number;
  isSelected: boolean;
  isPlaying?: boolean;
  onClick: () => void;
  onTimeClick?: (time: number) => void;
}

export const TranscriptSegment: React.FC<TranscriptSegmentProps> = ({
  text,
  start,
  duration,
  isSelected,
  isPlaying = false,
  onClick,
  onTimeClick
}) => {
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTimeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTimeClick) {
      onTimeClick(start);
    }
  };

  return (
    <div
      className={`
        transcript-segment p-4 rounded-lg border transition-all duration-300
        ${isSelected 
          ? 'border-red-500 bg-red-50 dark:bg-red-900/20 shadow-lg transform scale-[1.02]' 
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }
        ${isPlaying ? 'animate-pulse' : ''}
      `}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <Badge 
          variant={isSelected ? "default" : "outline"} 
          className={`
            transcript-timestamp cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 
            transition-colors flex items-center gap-1 shrink-0
            ${isSelected ? 'bg-red-500 text-white hover:bg-red-600' : ''}
          `}
          onClick={handleTimeClick}
        >
          {isPlaying ? (
            <Pause className="h-3 w-3" />
          ) : (
            <Play className="h-3 w-3" />
          )}
          {formatTime(start)}
        </Badge>
        
        <div className="flex-1 space-y-2">
          <p className={`
            text-sm leading-relaxed
            ${isSelected ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-700 dark:text-gray-300'}
          `}>
            {text}
          </p>
          
          {isSelected && (
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span>Duration: {duration.toFixed(1)}s</span>
              <span>Words: {text.split(' ').length}</span>
            </div>
          )}
        </div>
      </div>
      
      {isSelected && (
        <div className="mt-3 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-red-500 rounded-full transition-all duration-1000"
            style={{ width: isPlaying ? '100%' : '0%' }}
          />
        </div>
      )}
    </div>
  );
};

export default TranscriptSegment;