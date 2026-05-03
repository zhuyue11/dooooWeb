import { useEffect, useRef } from 'react';

const COLORS = [
  { r: 56, g: 189, b: 248 },  // sky blue
  { r: 129, g: 140, b: 248 }, // indigo
  { r: 192, g: 132, b: 252 }, // purple
  { r: 52, g: 211, b: 153 },  // emerald
  { r: 248, g: 113, b: 113 }, // red
  { r: 251, g: 191, b: 36 },  // amber
];

interface Band {
  baseY: number;
  amplitude: number;
  wavelength: number;
  speed: number;
  thickness: number;
  colorA: typeof COLORS[number];
  colorB: typeof COLORS[number];
  opacity: number;
  phaseOffset: number;
}

function generateBands(): Band[] {
  const bands: Band[] = [];
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    bands.push({
      baseY: 0.2 + t * 0.45,
      amplitude: 30 + i * 15,
      wavelength: 300 + i * 80,
      speed: 0.0003 + i * 0.00008,
      thickness: 60 + i * 20,
      colorA: COLORS[i % COLORS.length],
      colorB: COLORS[(i + 2) % COLORS.length],
      opacity: 0.18 + (1 - t) * 0.15,
      phaseOffset: i * 1.2,
    });
  }
  return bands;
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
        // Color interpolation over time
        const colorMix = (Math.sin(t * 0.3) + 1) / 2;
        const r = Math.round(band.colorA.r + (band.colorB.r - band.colorA.r) * colorMix);
        const g = Math.round(band.colorA.g + (band.colorB.g - band.colorA.g) * colorMix);
        const b = Math.round(band.colorA.b + (band.colorB.b - band.colorA.b) * colorMix);

        ctx.beginPath();
        ctx.moveTo(0, h);

        // Draw wavy top edge
        for (let x = 0; x <= w; x += 4) {
          const wave1 = Math.sin((x / band.wavelength) + t) * band.amplitude;
          const wave2 = Math.sin((x / (band.wavelength * 0.6)) + t * 1.3) * band.amplitude * 0.4;
          const y = band.baseY * h + wave1 + wave2;
          ctx.lineTo(x, y);
        }

        // Close to bottom-right, then bottom-left
        ctx.lineTo(w, h);
        ctx.closePath();

        // Gradient fill from band color to transparent at bottom
        const gradient = ctx.createLinearGradient(0, band.baseY * h - band.thickness, 0, band.baseY * h + band.thickness * 2);
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
        gradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${band.opacity})`);
        gradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${band.opacity * 0.6})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

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
