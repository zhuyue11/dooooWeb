import { useEffect, useRef, useState } from 'react';

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

interface CloudConfig {
  y: number;
  scale: number;
  opacity: number;
  speed: number;   // seconds for full scroll
  blur: number;
  depth: number;   // 0=far, 1=close
  blobs: CloudBlob[];
}

interface CloudBlob {
  offsetX: number;
  offsetY: number;
  radiusX: number;
  radiusY: number;
}

function generateCloud(rand: () => number, depth: number): CloudConfig {
  const blobCount = 4 + Math.floor(rand() * 4);
  const blobs: CloudBlob[] = [];

  for (let i = 0; i < blobCount; i++) {
    blobs.push({
      offsetX: (i - blobCount / 2) * (25 + rand() * 15),
      offsetY: (rand() - 0.5) * 20,
      radiusX: 30 + rand() * 40,
      radiusY: 20 + rand() * 15,
    });
  }

  return {
    y: 10 + depth * 70,
    scale: 0.5 + depth * 0.8,
    opacity: 0.06 + depth * 0.12,
    speed: 120 - depth * 60 + rand() * 30, // far=slow, close=faster
    blur: 6 - depth * 4,
    depth,
    blobs,
  };
}

function generateClouds(): CloudConfig[] {
  const rand = seededRandom(44);
  const result: CloudConfig[] = [];
  const count = 8;

  for (let i = 0; i < count; i++) {
    const depth = i / (count - 1);
    result.push(generateCloud(rand, depth));
  }
  return result;
}

const clouds = generateClouds();

function Cloud({ config }: { config: CloudConfig }) {
  const [startX] = useState(() => Math.random() * 100);

  return (
    <div
      className="absolute"
      style={{
        top: `${config.y}%`,
        left: '0',
        width: '200vw',
        opacity: config.opacity,
        filter: `blur(${config.blur}px)`,
        animation: `clouds-scroll ${config.speed}s linear infinite`,
        animationDelay: `${-(startX / 100) * config.speed}s`,
        zIndex: Math.round(config.depth * 10),
      }}
    >
      {/* Two copies for seamless loop */}
      {[0, 1].map(copy => (
        <svg
          key={copy}
          className="absolute top-0"
          style={{
            left: `${copy * 100}vw`,
            width: '100vw',
            height: `${150 * config.scale}px`,
            overflow: 'visible',
          }}
        >
          {/* Render cloud cluster centered in each copy */}
          <g transform={`translate(${500 * config.scale}, ${75 * config.scale}) scale(${config.scale})`}>
            {config.blobs.map((blob, j) => (
              <ellipse
                key={j}
                cx={blob.offsetX}
                cy={blob.offsetY}
                rx={blob.radiusX}
                ry={blob.radiusY}
                fill="var(--el-page-text)"
              />
            ))}
          </g>
        </svg>
      ))}
    </div>
  );
}

export function LoginClouds() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Subtle gradient sky
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {/* Clouds at different depth layers */}
      {clouds.map((config, i) => (
        <Cloud key={i} config={config} />
      ))}
    </div>
  );
}
