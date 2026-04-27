interface PulsingDotsProps {
  className?: string;
}

export function PulsingDots({ className = '' }: PulsingDotsProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`} data-testid="pulsing-dots">
      <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse-dot" />
      <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse-dot [animation-delay:200ms]" />
      <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse-dot [animation-delay:400ms]" />
    </div>
  );
}
