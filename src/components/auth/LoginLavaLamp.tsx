import { useEffect, useRef, useState } from 'react';
import ghostShort2 from '@/assets/logo-short2.png';
import ghostShort4 from '@/assets/logo-short4.png';
import ghostShort6 from '@/assets/logo-short6.png';
import ghostShort8 from '@/assets/logo-short8.png';
import ghostShort10 from '@/assets/logo-short10.png';
import ghostLong from '@/assets/logo-long.png';
import ghostLong2 from '@/assets/logo-long2.png';
import ghostLong4 from '@/assets/logo-long4.png';
import ghostTank from '@/assets/logo-tank.png';

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

const ghostAssets = [
  { src: ghostTank, name: 'tank' },
  { src: ghostShort10, name: 'short10' },
  { src: ghostShort8, name: 'short8' },
  { src: ghostShort6, name: 'short6' },
  { src: ghostShort4, name: 'short4' },
  { src: ghostShort2, name: 'short2' },
  { src: ghostLong, name: 'long' },
  { src: ghostLong2, name: 'long2' },
  { src: ghostLong4, name: 'long4' },
];

const COLORS = [
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

// Static properties that don't change over time
interface BlobConfig {
  src: string;
  name: string;
  color: string;
  width: number;
  opacity: number;
  blur: number;
  scaleMin: number;
  scaleMax: number;
  pulseDuration: number;
  relocateInterval: number; // ms between position changes
  transitionDuration: number; // seconds for the CSS transition
}

const BLOB_COUNT = 12;

function generateBlobConfigs(): BlobConfig[] {
  const rand = seededRandom(55);
  const result: BlobConfig[] = [];

  for (let i = 0; i < BLOB_COUNT; i++) {
    const g = ghostAssets[i % ghostAssets.length];
    const isLarge = rand() > 0.5;
    const width = isLarge ? 180 + rand() * 140 : 100 + rand() * 80;

    result.push({
      src: g.src,
      name: g.name,
      color: COLORS[i % COLORS.length],
      width,
      opacity: 0.35 + rand() * 0.25,
      blur: 6 + rand() * 10,
      scaleMin: 0.8,
      scaleMax: 1.2 + rand() * 0.2,
      pulseDuration: 6 + rand() * 10,
      relocateInterval: 12000 + rand() * 16000, // 12-28s between moves
      transitionDuration: 10 + rand() * 8,       // 10-18s CSS transition
    });
  }
  return result;
}

function randomPosition() {
  return {
    x: Math.random() * 85 + 5,  // 5-90%
    y: Math.random() * 75 + 10, // 10-85%
  };
}

function generateInitialPositions(): { x: number; y: number }[] {
  const rand = seededRandom(55);
  return Array.from({ length: BLOB_COUNT }, () => ({
    x: rand() * 85 + 5,
    y: rand() * 75 + 10,
  }));
}

const blobConfigs = generateBlobConfigs();
const initialPositions = generateInitialPositions();

function GhostBlob({ config, index }: { config: BlobConfig; index: number }) {
  const ratio = GHOST_RATIOS[config.name] ?? 1.5;
  const height = config.width * ratio;
  const [pos, setPos] = useState(initialPositions[index]);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    // Stagger the first move so blobs don't all jump at once
    const initialDelay = setTimeout(() => {
      setPos(randomPosition());
      intervalRef.current = setInterval(() => {
        setPos(randomPosition());
      }, config.relocateInterval);
    }, (index * 2000) + Math.random() * 3000);

    return () => {
      clearTimeout(initialDelay);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [config.relocateInterval, index]);

  return (
    <div
      className="absolute"
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        opacity: config.opacity,
        filter: `blur(${config.blur}px)`,
        transition: `left ${config.transitionDuration}s ease-in-out, top ${config.transitionDuration}s ease-in-out`,
      }}
    >
      <div
        style={{
          animation: `lava-pulse ${config.pulseDuration}s ease-in-out infinite`,
          '--lava-scale-min': `${config.scaleMin}`,
          '--lava-scale-max': `${config.scaleMax}`,
        } as React.CSSProperties}
      >
        <div
          style={{
            width: config.width,
            height,
            backgroundColor: config.color,
            maskImage: `url(${config.src})`,
            WebkitMaskImage: `url(${config.src})`,
            maskSize: '100% 100%',
            WebkitMaskSize: '100% 100%',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
          }}
        />
      </div>
    </div>
  );
}

export function LoginLavaLamp() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {/* Warm ambient gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 30% 70%, color-mix(in srgb, ${COLORS[0]} 30%, transparent) 0%, transparent 100%),
            radial-gradient(ellipse 60% 80% at 70% 30%, color-mix(in srgb, ${COLORS[5]} 30%, transparent) 0%, transparent 100%),
            radial-gradient(ellipse 70% 50% at 50% 50%, color-mix(in srgb, ${COLORS[8]} 22%, transparent) 0%, transparent 100%)
          `,
        }}
      />

      {/* Floating blobs */}
      {blobConfigs.map((config, i) => (
        <GhostBlob key={i} config={config} index={i} />
      ))}
    </div>
  );
}
