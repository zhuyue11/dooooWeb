import ghostShort2 from '@/assets/logo-short2.png';
import ghostShort4 from '@/assets/logo-short4.png';
import ghostShort6 from '@/assets/logo-short6.png';
import ghostShort8 from '@/assets/logo-short8.png';
import ghostShort10 from '@/assets/logo-short10.png';
import ghostLong from '@/assets/logo-long.png';
import ghostLong2 from '@/assets/logo-long2.png';
import ghostLong4 from '@/assets/logo-long4.png';
import ghostTank from '@/assets/logo-tank.png';

const GHOST_WIDTH = 60; // px — uniform width for all ghosts

// Aspect ratios (height/width) from original PNG dimensions — all 257px wide
const GHOST_RATIOS: Record<string, number> = {
  short10: 385 / 257,
  short8: 513 / 257,
  short6: 641 / 257,
  short4: 769 / 257,
  short2: 897 / 257,
  long: 1025 / 257,
  long2: 1153 / 257,
  long4: 1281 / 257,
  tank: 129 / 257,
};

const ghosts = [
  { src: ghostShort10, name: 'short10' },
  { src: ghostShort8, name: 'short8' },
  { src: ghostShort6, name: 'short6' },
  { src: ghostShort4, name: 'short4' },
  { src: ghostShort2, name: 'short2' },
  { src: ghostLong, name: 'long' },
  { src: ghostLong2, name: 'long2' },
  { src: ghostLong4, name: 'long4' },
  { src: ghostTank, name: 'tank' },
  { src: ghostTank, name: 'tank' },  // extra weight
  { src: ghostTank, name: 'tank' },  // extra weight
];

const GHOST_COLORS = [
  '#f87171', '#fb923c', '#fbbf24', '#34d399', '#38bdf8', '#818cf8',
  '#c084fc', '#f472b6', '#a78bfa', '#2dd4bf', '#60a5fa', '#a3e635',
];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

interface ScatterGhost {
  src: string;
  name: string;
  x: number;
  y: number;
  color: string;
  opacity: number;
  scale: number;
  driftX: number;
  driftY: number;
  duration: number;
  delay: number;
}

interface ParadeGhost {
  src: string;
  name: string;
  color: string;
  bobHeight: number;
  duration: number;
  delay: number;
}

function generateScatterGhosts(count: number): ScatterGhost[] {
  const rand = seededRandom(42);
  const result: ScatterGhost[] = [];

  // Place ghosts in a grid-ish pattern to ensure even coverage,
  // then jitter positions so it doesn't look mechanical
  const cols = 6;
  const rows = Math.ceil(count / cols);

  for (let i = 0; i < count; i++) {
    const g = ghosts[Math.floor(rand() * ghosts.length)];
    const col = i % cols;
    const row = Math.floor(i / cols);

    // Base grid position with jitter — full 0-96% horizontal spread
    const baseX = (col / (cols - 1)) * 92 + 2;  // 2-94% spread
    const baseY = (row / rows) * 75 + 5;        // 5-80% spread
    const jitterX = (rand() - 0.5) * 10;
    const jitterY = (rand() - 0.5) * 14;

    result.push({
      src: g.src,
      name: g.name,
      x: Math.max(2, Math.min(95, baseX + jitterX)),
      y: Math.max(2, Math.min(85, baseY + jitterY)),
      color: GHOST_COLORS[i % GHOST_COLORS.length],
      opacity: 0.10 + rand() * 0.12,        // 10-22% — more visible
      scale: 0.7 + rand() * 1.0,            // 42-102px wide — bigger
      driftX: 15 + rand() * 30,
      driftY: 10 + rand() * 25,
      duration: 25 + rand() * 35,
      delay: -(rand() * 30),
    });
  }
  return result;
}

function generateParadeGhosts(): ParadeGhost[] {
  const paradeSelection = [
    ghosts[0], ghosts[2], ghosts[4], ghosts[5],
    ghosts[3], ghosts[1], ghosts[7],
  ];
  return paradeSelection.map((g, i) => ({
    src: g.src,
    name: g.name,
    color: GHOST_COLORS[i],
    bobHeight: 6 + (i % 3) * 4,
    duration: 2.5 + (i % 4) * 0.5,
    delay: -(i * 0.4),
  }));
}

const scatterGhosts = generateScatterGhosts(24);
const paradeGhosts = generateParadeGhosts();

function GhostShape({ src, name, width, color }: {
  src: string; name: string; width: number; color: string;
}) {
  const ratio = GHOST_RATIOS[name] ?? 1.5;
  const height = width * ratio;
  return (
    <div
      style={{
        width,
        height,
        backgroundColor: color,
        maskImage: `url(${src})`,
        WebkitMaskImage: `url(${src})`,
        maskSize: '100% 100%',
        WebkitMaskSize: '100% 100%',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
      }}
    />
  );
}

export function LoginGhosts() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {/* Background scatter */}
      {scatterGhosts.map((g, i) => (
        <div
          key={`scatter-${i}`}
          className="absolute"
          style={{
            left: `${g.x}%`,
            top: `${g.y}%`,
            opacity: g.opacity,
            animation: `ghost-drift ${g.duration}s ease-in-out ${g.delay}s infinite`,
            '--drift-x': `${g.driftX}px`,
            '--drift-y': `${g.driftY}px`,
          } as React.CSSProperties}
        >
          <div style={{ animation: `ghost-rotate ${g.duration * 1.3}s ease-in-out infinite` }}>
            <GhostShape src={g.src} name={g.name} width={GHOST_WIDTH * g.scale} color={g.color} />
          </div>
        </div>
      ))}

      {/* Parade row along bottom */}
      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center gap-6 px-8 pb-4">
        {paradeGhosts.map((g, i) => (
          <div
            key={`parade-${i}`}
            style={{
              opacity: 0,
              animation: `ghost-enter 0.6s ease-out ${0.3 + i * 0.12}s forwards, ghost-bob ${g.duration}s ease-in-out ${g.delay}s infinite`,
              '--bob': `${g.bobHeight}px`,
            } as React.CSSProperties}
          >
            <div style={{ opacity: 0.25 }}>
              <GhostShape src={g.src} name={g.name} width={GHOST_WIDTH} color={g.color} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
