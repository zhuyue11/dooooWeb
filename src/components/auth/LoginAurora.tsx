import { useEffect, useRef } from 'react';

const PALETTE = [
  { r: 56, g: 189, b: 248 },  // sky blue
  { r: 52, g: 211, b: 153 },  // emerald
  { r: 163, g: 230, b: 53 },  // lime
  { r: 251, g: 191, b: 36 },  // amber
  { r: 248, g: 113, b: 113 }, // red
  { r: 244, g: 114, b: 182 }, // pink
  { r: 192, g: 132, b: 252 }, // purple
  { r: 129, g: 140, b: 248 }, // indigo
  { r: 45, g: 212, b: 191 },  // teal
  { r: 96, g: 165, b: 250 },  // blue
];

interface Band {
  baseY: number;
  amplitude: number;
  wavelength: number;
  speed: number;
  thickness: number;
  colorSpeed: number;
  colorOffset: number;
  opacity: number;
  phaseOffset: number;
}

function generateBands(): Band[] {
  const bands: Band[] = [];
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    bands.push({
      baseY: 0.15 + t * 0.55,
      amplitude: 25 + i * 12,
      wavelength: 250 + i * 70,
      speed: 0.0003 + i * 0.00006,
      thickness: 50 + i * 18,
      colorSpeed: 0.00008 + i * 0.00003,
      colorOffset: i * (PALETTE.length / 7),
      opacity: 0.20 + (1 - t) * 0.15,
      phaseOffset: i * 1.0,
    });
  }
  return bands;
}

function getColor(position: number): { r: number; g: number; b: number } {
  const len = PALETTE.length;
  const p = ((position % len) + len) % len;
  const idx = Math.floor(p);
  const frac = p - idx;
  const a = PALETTE[idx % len];
  const b = PALETTE[(idx + 1) % len];
  return {
    r: Math.round(a.r + (b.r - a.r) * frac),
    g: Math.round(a.g + (b.g - a.g) * frac),
    b: Math.round(a.b + (b.b - a.b) * frac),
  };
}

const bands = generateBands();

export function LoginAurora() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    function draw(now: number) {
      const w = canvas!.width;
      const h = canvas!.height;
      ctx.clearRect(0, 0, w, h);

      for (const band of bands) {
        const t = now * band.speed + band.phaseOffset;
        const colorPos = band.colorOffset + now * band.colorSpeed;
        const c1 = getColor(colorPos);
        const c2 = getColor(colorPos + 3);

        ctx.beginPath();
        ctx.moveTo(0, h);

        for (let x = 0; x <= w; x += 4) {
          const wave1 = Math.sin((x / band.wavelength) + t) * band.amplitude;
          const wave2 = Math.sin((x / (band.wavelength * 0.6)) + t * 1.3) * band.amplitude * 0.4;
          const wave3 = Math.sin((x / (band.wavelength * 1.8)) + t * 0.7) * band.amplitude * 0.25;
          const y = band.baseY * h + wave1 + wave2 + wave3;
          ctx.lineTo(x, y);
        }

        ctx.lineTo(w, h);
        ctx.closePath();

        // Vertical gradient with two shifting colors
        const gradient = ctx.createLinearGradient(0, band.baseY * h - band.thickness, 0, band.baseY * h + band.thickness * 2);
        gradient.addColorStop(0, `rgba(${c1.r}, ${c1.g}, ${c1.b}, 0)`);
        gradient.addColorStop(0.25, `rgba(${c1.r}, ${c1.g}, ${c1.b}, ${band.opacity})`);
        gradient.addColorStop(0.5, `rgba(${c2.r}, ${c2.g}, ${c2.b}, ${band.opacity * 0.8})`);
        gradient.addColorStop(0.75, `rgba(${c1.r}, ${c1.g}, ${c1.b}, ${band.opacity * 0.4})`);
        gradient.addColorStop(1, `rgba(${c2.r}, ${c2.g}, ${c2.b}, 0)`);

        ctx.fillStyle = gradient;
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
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
