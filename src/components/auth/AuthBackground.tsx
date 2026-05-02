import { useState, useEffect } from 'react';
import { LoginGhosts } from './LoginGhosts';
import { LoginRockets } from './LoginRockets';

const BACKGROUNDS = [LoginGhosts, LoginRockets] as const;

export function AuthBackground() {
  // Randomly pick a background on mount
  const [bgIndex] = useState(() => Math.floor(Math.random() * BACKGROUNDS.length));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const Background = BACKGROUNDS[bgIndex];

  return (
    <div
      className="transition-opacity duration-1000"
      style={{ opacity: mounted ? 1 : 0 }}
    >
      <Background />
    </div>
  );
}
