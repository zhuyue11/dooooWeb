import { useState, useEffect, useCallback } from 'react';
import { Icon } from '@/components/ui/Icon';
import { LoginGhosts } from './LoginGhosts';
import { LoginRockets } from './LoginRockets';
import { LoginLavaLamp } from './LoginLavaLamp';
import { LoginAurora } from './LoginAurora';
import { LoginTopography } from './LoginTopography';
import { LoginClouds } from './LoginClouds';

const BACKGROUNDS = [LoginGhosts, LoginRockets, LoginLavaLamp, LoginAurora, LoginTopography, LoginClouds] as const;

export function AuthBackground() {
  const [bgIndex, setBgIndex] = useState(() => Math.floor(Math.random() * BACKGROUNDS.length));
  const [mounted, setMounted] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSwitch = useCallback(() => {
    if (transitioning) return;
    setTransitioning(true);
    // After fade-out completes, swap background and fade back in
    setTimeout(() => {
      setBgIndex(prev => (prev + 1) % BACKGROUNDS.length);
      setTransitioning(false);
    }, 600);
  }, [transitioning]);

  const BgComponent = BACKGROUNDS[bgIndex];

  return (
    <>
      <div
        className="transition-opacity duration-[600ms] ease-in-out"
        style={{ opacity: mounted && !transitioning ? 1 : 0 }}
      >
        <BgComponent />
      </div>

      {/* Switch button + label — bottom-right corner */}
      <button
        onClick={handleSwitch}
        className="fixed bottom-5 right-5 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-(--el-page-bg) opacity-40 shadow-(--shadow-elevated) transition-opacity hover:opacity-70"
        aria-label="Switch background"
      >
        <Icon name="shuffle" size={16} />
      </button>
    </>
  );
}
