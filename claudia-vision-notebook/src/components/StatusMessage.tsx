import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

export type StatusType = 'error' | 'success' | 'warning' | 'info';

interface StatusMessageProps {
  type: StatusType;
  message: string;
  onClose?: () => void;
  autoHide?: boolean;
  duration?: number;
}

export const StatusMessage: React.FC<StatusMessageProps> = ({
  type,
  message,
  onClose,
  autoHide = true,
  duration = 5000
}) => {
  useEffect(() => {
    if (autoHide && onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [autoHide, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'error':
        return <XCircle className="h-5 w-5" />;
      case 'success':
        return <CheckCircle className="h-5 w-5" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5" />;
      case 'info':
        return <Info className="h-5 w-5" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'error':
        return 'status-error';
      case 'success':
        return 'status-success';
      case 'warning':
        return 'status-warning';
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300';
    }
  };

  return (
    <div className={`status-message flex items-center gap-3 p-4 rounded-lg ${getStyles()}`}>
      {getIcon()}
      <span className="flex-1">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-2 opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Close message"
        >
          <XCircle className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

interface StatusMessageContainerProps {
  messages: Array<{
    id: string;
    type: StatusType;
    message: string;
  }>;
  onRemove: (id: string) => void;
}

export const StatusMessageContainer: React.FC<StatusMessageContainerProps> = ({
  messages,
  onRemove
}) => {
  if (messages.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {messages.map((msg) => (
        <StatusMessage
          key={msg.id}
          type={msg.type}
          message={msg.message}
          onClose={() => onRemove(msg.id)}
        />
      ))}
    </div>
  );
};

export default StatusMessage;