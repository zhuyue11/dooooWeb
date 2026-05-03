import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { LoginGhosts } from './LoginGhosts';
import { LoginRockets } from './LoginRockets';
import { LoginLavaLamp } from './LoginLavaLamp';
import { LoginAurora } from './LoginAurora';
import { LoginTopography } from './LoginTopography';
import { LoginClouds } from './LoginClouds';
import { LoginGameOfLife } from './LoginGameOfLife';

const BACKGROUNDS = [
  { component: LoginGhosts, link: null },
  { component: LoginRockets, link: null },
  { component: LoginLavaLamp, link: null },
  { component: LoginAurora, link: null },
  { component: LoginTopography, link: null },
  { component: LoginClouds, link: null },
  { component: LoginGameOfLife, link: { labelKey: 'auth.conwaysGameOfLife', url: 'https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life' } },
];

export function AuthBackground() {
  const { t } = useTranslation();
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

  const bg = BACKGROUNDS[bgIndex];
  const BgComponent = bg.component;
  const { link } = bg;

  return (
    <>
      <div
        className="transition-opacity duration-[600ms] ease-in-out"
        style={{ opacity: mounted && !transitioning ? 1 : 0 }}
      >
        <BgComponent />
      </div>

      <div className="fixed bottom-5 right-5 z-20 flex items-center gap-2">
        {/* Wiki link — shown when background has one */}
        {link && (
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 items-center gap-1.5 rounded-full bg-(--el-page-bg) px-3 opacity-40 shadow-(--shadow-elevated) transition-opacity hover:opacity-70"
          >
            <Icon name="info" size={14} />
            <span className="text-xs font-medium text-(--el-page-text)">{t(link.labelKey)}</span>
          </a>
        )}

        {/* Switch button */}
        <button
          onClick={handleSwitch}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-(--el-page-bg) opacity-40 shadow-(--shadow-elevated) transition-opacity hover:opacity-70"
          aria-label="Switch background"
        >
          <Icon name="shuffle" size={16} />
        </button>
      </div>
    </>
  );
}
