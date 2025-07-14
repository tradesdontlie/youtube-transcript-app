import * as React from "react";
import { cn } from "@/lib/utils";

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "default" | "lg";
}

/**
 * Spinner component for loading states
 * 
 * @example
 * <Spinner size="sm" />
 */
export const Spinner: React.FC<SpinnerProps> = ({ 
  className, 
  size = "default",
  ...props 
}) => {
  return (
    <div
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-current border-t-transparent",
        {
          "h-4 w-4": size === "sm",
          "h-6 w-6": size === "default",
          "h-8 w-8": size === "lg",
        },
        className
      )}
      {...props}
    />
  );
};

interface LoadingDotsProps extends React.HTMLAttributes<HTMLSpanElement> {}

/**
 * Loading dots animation component
 * 
 * @example
 * <LoadingDots />
 */
export const LoadingDots: React.FC<LoadingDotsProps> = ({ 
  className, 
  ...props 
}) => {
  return (
    <span 
      className={cn("loading-dots", className)} 
      {...props}
    />
  );
};

interface LoadingOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string;
}

/**
 * Loading overlay component
 * 
 * @example
 * <LoadingOverlay message="Processing..." />
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  message,
  className,
  ...props 
}) => {
  return (
    <div 
      className={cn("loading-overlay", className)}
      {...props}
    >
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        {message && (
          <p className="text-sm text-foreground/80">{message}</p>
        )}
      </div>
    </div>
  );
};