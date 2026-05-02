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

const ROCKET_WIDTH = 50;

const STAGES = [
  { src: ghostTank, ratio: 129 / 257 },
  { src: ghostShort10, ratio: 385 / 257 },
  { src: ghostShort8, ratio: 513 / 257 },
  { src: ghostShort6, ratio: 641 / 257 },
  { src: ghostShort4, ratio: 769 / 257 },
  { src: ghostShort2, ratio: 897 / 257 },
  { src: ghostLong, ratio: 1025 / 257 },
  { src: ghostLong2, ratio: 1153 / 257 },
  { src: ghostLong4, ratio: 1281 / 257 },
];

const COLORS = [
  '#f87171', '#fb923c', '#fbbf24', '#34d399', '#38bdf8', '#818cf8',
  '#c084fc', '#f472b6', '#a78bfa', '#2dd4bf', '#60a5fa', '#a3e635',
];

const STAGE_MS = 800;
const LAUNCH_MS = 1200;
const PAUSE_MS = 1500;
const BUILD_MS = STAGES.length * STAGE_MS;
const TOTAL_MS = BUILD_MS + LAUNCH_MS + PAUSE_MS;

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

// ── Stars ──────────────────────────────────────────────

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkleDuration: number;
  twinkleDelay: number;
}

function generateStars(count: number): Star[] {
  const rand = seededRandom(123);
  const result: Star[] = [];
  for (let i = 0; i < count; i++) {
    result.push({
      x: rand() * 100,
      y: rand() * 60,  // mostly in upper 60% — above the horizon
      size: 1.5 + rand() * 2.5,
      opacity: 0.3 + rand() * 0.5,
      twinkleDuration: 2 + rand() * 4,
      twinkleDelay: -(rand() * 6),
    });
  }
  return result;
}

const stars = generateStars(60);

// ── Launch pads ────────────────────────────────────────

interface PadConfig {
  x: number;
  y: number;
  color: string;
  scale: number;
  depth: number;     // 0 = far (top), 1 = close (bottom)
  saturation: number; // 0-1, far = desaturated
  baseOpacity: number;
  offset: number;
}

function generatePads(count: number): PadConfig[] {
  const rand = seededRandom(77);
  const result: PadConfig[] = [];

  for (let i = 0; i < count; i++) {
    const x = rand() * 92 + 4;        // 4-96%
    const y = rand() * 65 + 18;       // 18-83%
    const depth = (y - 18) / 65;      // 0 = far (top), 1 = close (bottom)

    result.push({
      x,
      y,
      color: COLORS[i % COLORS.length],
      scale: 0.4 + depth * 0.8,
      depth,
      saturation: 0.3 + depth * 0.7,
      baseOpacity: 0.6 + depth * 0.35,
      offset: Math.floor(rand() * TOTAL_MS),
    });
  }
  result.sort((a, b) => a.depth - b.depth);
  return result;
}

const pads = generatePads(14);

// ── Exhaust particle ───────────────────────────────────

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  opacity: number;
  birth: number;
}

const PARTICLE_LIFETIME = 800; // ms

// ── Rocket pad component ───────────────────────────────

function randomizePosition() {
  const x = Math.random() * 92 + 4;    // 4-96%
  const y = Math.random() * 65 + 18;   // 18-83%
  const depth = (y - 18) / 65;
  return { x, y, depth };
}

function RocketPad({ config, onExhaust }: {
  config: PadConfig;
  onExhaust: (x: number, y: number, color: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const padGlowRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const stageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const posRef = useRef({ x: config.x, y: config.y, depth: config.depth });

  useEffect(() => {
    const container = containerRef.current;
    const padGlow = padGlowRef.current;
    const wrapper = wrapperRef.current;
    if (!container || !padGlow || !wrapper) return;

    let raf: number;
    const startTime = performance.now() - config.offset;
    let lastExhaustTime = 0;
    let lastCycle = -1;

    function applyPosition() {
      const { x, y, depth } = posRef.current;
      const scale = 0.4 + depth * 0.8;
      const w = ROCKET_WIDTH * scale;
      const maxH = w * STAGES[STAGES.length - 1].ratio;

      wrapper!.style.filter = `saturate(${0.6 + depth * 0.4})`;
      wrapper!.style.zIndex = String(Math.round(depth * 10));

      container!.style.left = `${x}%`;
      container!.style.top = `${y}%`;
      container!.style.width = `${w}px`;
      container!.style.height = `${maxH}px`;

      padGlow!.style.left = `${x}%`;
      padGlow!.style.top = `${y}%`;
      padGlow!.style.marginTop = `${maxH}px`;
      padGlow!.style.width = `${w * 1.6}px`;

      // Update stage sizes
      stageRefs.current.forEach((el, i) => {
        if (!el) return;
        const h = w * STAGES[i].ratio;
        const mask = el.firstElementChild as HTMLDivElement;
        if (mask) {
          mask.style.width = `${w}px`;
          mask.style.height = `${h}px`;
        }
      });
    }

    applyPosition();

    function tick(now: number) {
      const totalElapsed = now - startTime;
      const currentCycle = Math.floor(totalElapsed / TOTAL_MS);
      const elapsed = totalElapsed % TOTAL_MS;

      // New cycle — pick a new random position
      if (currentCycle !== lastCycle) {
        lastCycle = currentCycle;
        if (currentCycle > 0) {
          posRef.current = randomizePosition();
          applyPosition();
        }
      }

      const { depth } = posRef.current;
      const baseOpacity = 0.6 + depth * 0.35;

      if (elapsed < BUILD_MS) {
        const stageIndex = Math.floor(elapsed / STAGE_MS);
        stageRefs.current.forEach((el, i) => {
          if (el) el.style.opacity = i === stageIndex ? '1' : '0';
        });
        container!.style.transform = 'translateX(-50%) translateY(0)';
        container!.style.opacity = String(baseOpacity);
        padGlow!.style.opacity = String(0.3 + Math.sin(elapsed * 0.003) * 0.15);
        padGlow!.style.transform = 'translateX(-50%) scaleX(1)';
      } else if (elapsed < BUILD_MS + LAUNCH_MS) {
        const launchProgress = (elapsed - BUILD_MS) / LAUNCH_MS;
        stageRefs.current.forEach((el, i) => {
          if (el) el.style.opacity = i === STAGES.length - 1 ? '1' : '0';
        });
        const y = -launchProgress * 120;
        container!.style.transform = `translateX(-50%) translateY(${y}vh)`;
        container!.style.opacity = String(baseOpacity * (1 - launchProgress * 0.7));

        const glowIntensity = launchProgress < 0.2
          ? 0.6 + launchProgress * 2
          : Math.max(0, 1 - (launchProgress - 0.2) * 1.5);
        padGlow!.style.opacity = String(glowIntensity);
        padGlow!.style.transform = `translateX(-50%) scaleX(${1 + launchProgress * 2})`;

        if (now - lastExhaustTime > 50) {
          lastExhaustTime = now;
          const rect = container!.getBoundingClientRect();
          onExhaust(rect.left + rect.width / 2, rect.bottom, config.color);
        }
      } else {
        stageRefs.current.forEach(el => {
          if (el) el.style.opacity = '0';
        });
        container!.style.opacity = '0';
        padGlow!.style.opacity = '0';
      }

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [config.offset, config.color, onExhaust]);

  const initW = ROCKET_WIDTH * config.scale;
  const initMaxH = initW * STAGES[STAGES.length - 1].ratio;

  return (
    <div ref={wrapperRef} style={{ position: 'absolute', inset: 0 }}>
      {/* Pad glow */}
      <div
        ref={padGlowRef}
        className="absolute"
        style={{
          left: `${config.x}%`,
          top: `${config.y}%`,
          marginTop: initMaxH,
          width: initW * 1.6,
          height: 4,
          borderRadius: '50%',
          background: `radial-gradient(ellipse, ${config.color} 0%, transparent 70%)`,
          opacity: 0,
          transform: 'translateX(-50%)',
          filter: 'blur(3px)',
        }}
      />
      {/* Rocket */}
      <div
        ref={containerRef}
        className="absolute"
        style={{
          left: `${config.x}%`,
          top: `${config.y}%`,
          width: initW,
          height: initMaxH,
          transform: 'translateX(-50%)',
          opacity: config.baseOpacity,
        }}
      >
        {STAGES.map((stage, i) => {
          const h = initW * stage.ratio;
          return (
            <div
              key={i}
              ref={el => { stageRefs.current[i] = el; }}
              className="absolute bottom-0 left-0"
              style={{ opacity: 0, transition: 'opacity 0.15s' }}
            >
              <div
                style={{
                  width: initW,
                  height: h,
                  backgroundColor: config.color,
                  maskImage: `url(${stage.src})`,
                  WebkitMaskImage: `url(${stage.src})`,
                  maskSize: '100% 100%',
                  WebkitMaskSize: '100% 100%',
                  maskRepeat: 'no-repeat',
                  WebkitMaskRepeat: 'no-repeat',
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────

export function LoginRockets() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const nextIdRef = useRef(0);
  const [, setReady] = useState(false);

  const addParticle = useRef((x: number, y: number, color: string) => {
    const spread = (Math.random() - 0.5) * 12;
    particlesRef.current.push({
      id: nextIdRef.current++,
      x: x + spread,
      y,
      color,
      size: 3 + Math.random() * 5,
      opacity: 0.5 + Math.random() * 0.3,
      birth: performance.now(),
    });
  }).current;

  // Canvas exhaust rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf: number;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);
    setReady(true);

    function draw(now: number) {
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);

      particlesRef.current = particlesRef.current.filter(
        p => now - p.birth < PARTICLE_LIFETIME
      );

      for (const p of particlesRef.current) {
        const age = (now - p.birth) / PARTICLE_LIFETIME;
        const fadeOpacity = p.opacity * (1 - age);
        const drift = Math.sin(p.id * 0.7 + age * 5) * 6 * age;
        const fall = age * 35;

        ctx.globalAlpha = fadeOpacity;
        ctx.beginPath();
        ctx.arc(p.x + drift, p.y + fall, p.size * (1 - age * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {/* Gradient sky — dark top, lighter bottom */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, var(--el-page-bg) 0%, color-mix(in srgb, var(--el-page-bg) 85%, var(--color-primary)) 100%)',
          opacity: 0.5,
        }}
      />

      {/* Twinkling stars */}
      {stars.map((s, i) => (
        <div
          key={`star-${i}`}
          className="absolute rounded-full"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            backgroundColor: 'var(--el-page-text)',
            opacity: s.opacity,
            animation: `star-twinkle ${s.twinkleDuration}s ease-in-out ${s.twinkleDelay}s infinite`,
          }}
        />
      ))}

      {/* Exhaust particles canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Perspective ground plane — trapezoid spanning full height */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="grid-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--el-page-text)" stopOpacity="0" />
            <stop offset="30%" stopColor="var(--el-page-text)" stopOpacity="0.02" />
            <stop offset="100%" stopColor="var(--el-page-text)" stopOpacity="0.06" />
          </linearGradient>
          <clipPath id="trapezoid-clip">
            <polygon points="350,0 650,0 1200,1000 -200,1000" />
          </clipPath>
        </defs>

        {/* Perspective grid lines — clipped to trapezoid */}
        <g clipPath="url(#trapezoid-clip)">
          {/* Horizontal lines — exponential spacing for perspective */}
          {[0.05, 0.10, 0.16, 0.23, 0.31, 0.40, 0.50, 0.62, 0.75, 0.88, 1.0].map((t, i) => {
            const y = t * 1000;
            return (
              <line
                key={`h-${i}`}
                x1="-200" y1={y} x2="1200" y2={y}
                stroke="url(#grid-fade)"
                strokeWidth={0.5 + t * 1.5}
              />
            );
          })}
          {/* Vertical lines — converge to vanishing point (500, 0) */}
          {[-200, -50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1050, 1200].map((bx, i) => (
            <line
              key={`v-${i}`}
              x1="500" y1="0"
              x2={bx} y2="1000"
              stroke="url(#grid-fade)"
              strokeWidth={1}
            />
          ))}
        </g>
      </svg>

      {/* Rocket pads — each manages its own position, depth, and z-order */}
      {pads.map((pad, i) => (
        <RocketPad key={i} config={pad} onExhaust={addParticle} />
      ))}
    </div>
  );
}
