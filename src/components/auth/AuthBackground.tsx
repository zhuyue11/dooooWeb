import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { LoginRockets } from './LoginRockets';
import { LoginLavaLamp } from './LoginLavaLamp';
import { LoginAurora } from './LoginAurora';
import { LoginTopography } from './LoginTopography';
import { LoginGameOfLife } from './LoginGameOfLife';
import { LoginLangtonsAnt } from './LoginLangtonsAnt';
import { LoginBriansBrain } from './LoginBriansBrain';
import { LoginRule110 } from './LoginRule110';
import { LoginWireWorld } from './LoginWireWorld';
import { LoginDayNight } from './LoginDayNight';
import { LoginCyclicCA } from './LoginCyclicCA';

const BACKGROUNDS = [
  { component: LoginRockets, link: null },
  { component: LoginLavaLamp, link: null },
  { component: LoginAurora, link: null },
  { component: LoginTopography, link: null },
  { component: LoginGameOfLife, link: { labelKey: 'auth.conwaysGameOfLife', url: 'https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life' } },
  { component: LoginLangtonsAnt, link: { labelKey: 'auth.langtonsAnt', url: 'https://en.wikipedia.org/wiki/Langton%27s_ant' } },
  { component: LoginBriansBrain, link: { labelKey: 'auth.briansBrain', url: 'https://en.wikipedia.org/wiki/Brian%27s_Brain' } },
  { component: LoginRule110, link: { labelKey: 'auth.rule110', url: 'https://en.wikipedia.org/wiki/Rule_110' } },
  { component: LoginWireWorld, link: { labelKey: 'auth.wireworld', url: 'https://en.wikipedia.org/wiki/Wireworld' } },
  { component: LoginDayNight, link: { labelKey: 'auth.dayAndNight', url: 'https://en.wikipedia.org/wiki/Day_and_Night_(cellular_automaton)' } },
  { component: LoginCyclicCA, link: { labelKey: 'auth.cyclicCA', url: 'https://en.wikipedia.org/wiki/Cyclic_cellular_automaton' } },
];

export function AuthBackground() {
  const { t } = useTranslation();
  // Only land on non-pattern backgrounds initially; patterns are reachable via shuffle
  const [bgIndex, setBgIndex] = useState(() => {
    const nonPatternCount = BACKGROUNDS.filter(bg => !bg.link).length;
    return Math.floor(Math.random() * nonPatternCount);
  });
  const [resetKey, setResetKey] = useState(0);
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
        <BgComponent key={resetKey} />
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

        {/* Reset button — shown for automata backgrounds */}
        {link && (
          <button
            onClick={() => setResetKey(k => k + 1)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-(--el-page-bg) opacity-40 shadow-(--shadow-elevated) transition-opacity hover:opacity-70"
            aria-label="Reset"
          >
            <Icon name="replay" size={16} />
          </button>
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
