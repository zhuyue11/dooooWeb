import { useRef, useEffect } from 'react';

export function PopoverWrapper({ children, onClose, className }: {
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div ref={ref} className={`absolute left-0 top-full mt-1 z-50 rounded-xl border border-border bg-surface shadow-[0_8px_24px_rgba(0,0,0,0.2)] ${className || ''}`}>
      {children}
    </div>
  );
}
