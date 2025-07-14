import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingButtonProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  isLoading,
  children,
  loadingText = "Loading",
  className
}) => {
  if (isLoading) {
    return (
      <>
        <Loader2 className={cn("h-4 w-4 animate-spin mr-2", className)} />
        {loadingText}<span className="loading-dots"></span>
      </>
    );
  }
  return <>{children}</>;
};

interface LoadingStateProps {
  isLoading: boolean;
  message?: string;
  size?: "sm" | "default" | "lg";
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  isLoading,
  message = "Loading...",
  size = "default",
  className
}) => {
  if (!isLoading) return null;

  const sizeClasses = {
    sm: "h-4 w-4",
    default: "h-6 w-6",
    lg: "h-8 w-8"
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Loader2 className={cn("animate-spin", sizeClasses[size])} />
      {message && <span className="text-muted-foreground">{message}</span>}
    </div>
  );
};

interface InlineLoadingProps {
  isLoading: boolean;
  className?: string;
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({
  isLoading,
  className
}) => {
  if (!isLoading) return null;

  return <div className={cn("spinner spinner-sm inline-block", className)}></div>;
};

interface FullPageLoadingProps {
  isLoading: boolean;
  message?: string;
}

export const FullPageLoading: React.FC<FullPageLoadingProps> = ({
  isLoading,
  message = "Loading..."
}) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg font-medium">{message}</p>
      </div>
    </div>
  );
};

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div 
      className={cn(
        "animate-pulse bg-muted rounded-md",
        className
      )}
    />
  );
};

export const SkeletonText: React.FC<{ lines?: number }> = ({ lines = 3 }) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={cn(
            "h-4",
            i === lines - 1 && "w-3/4"
          )}
        />
      ))}
    </div>
  );
};

export const SkeletonCard: React.FC = () => {
  return (
    <div className="rounded-lg border bg-card p-6">
      <Skeleton className="h-6 w-1/3 mb-4" />
      <SkeletonText lines={3} />
      <div className="flex gap-2 mt-4">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
};