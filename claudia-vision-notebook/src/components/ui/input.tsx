import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

/**
 * Input component for text/number inputs
 * 
 * @example
 * <Input type="text" placeholder="Enter value..." />
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-all duration-200",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "focus-visible:ring-ring focus-visible:ring-offset-background",
          "hover:border-border/80",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/50",
          "placeholder:text-muted-foreground/80",
          className
        )}
        style={{
          borderColor: "var(--color-input)",
          backgroundColor: "var(--color-background)",
          color: "var(--color-foreground)"
        }}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input }; 