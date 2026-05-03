import { useEffect, useRef } from 'react';

export function LoginTopography() {
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

    // Noise function — simple 2D value noise with interpolation
    const GRID = 64;
    const noiseGrid: number[][] = [];
    for (let i = 0; i < GRID + 1; i++) {
      noiseGrid[i] = [];
      for (let j = 0; j < GRID + 1; j++) {
        noiseGrid[i][j] = Math.random();
      }
    }

    function lerp(a: number, b: number, t: number) {
      return a + (b - a) * t;
    }

    function smoothstep(t: number) {
      return t * t * (3 - 2 * t);
    }

    function noise(x: number, y: number): number {
      const xi = Math.floor(x) % GRID;
      const yi = Math.floor(y) % GRID;
      const xf = smoothstep(x - Math.floor(x));
      const yf = smoothstep(y - Math.floor(y));

      const nxi = (xi + 1) % (GRID + 1);
      const nyi = (yi + 1) % (GRID + 1);

      const top = lerp(noiseGrid[xi][yi], noiseGrid[nxi][yi], xf);
      const bottom = lerp(noiseGrid[xi][nyi], noiseGrid[nxi][nyi], xf);
      return lerp(top, bottom, yf);
    }

    function fbm(x: number, y: number): number {
      let value = 0;
      let amplitude = 0.5;
      let frequency = 1;
      for (let i = 0; i < 4; i++) {
        value += noise(x * frequency, y * frequency) * amplitude;
        amplitude *= 0.5;
        frequency *= 2;
      }
      return value;
    }

    const CONTOUR_LEVELS = 12;
    const LINE_SPACING = 1 / CONTOUR_LEVELS;
    const SAMPLE_STEP = 6; // pixels between samples

    function draw(now: number) {
      const w = canvas!.width;
      const h = canvas!.height;
      ctx.clearRect(0, 0, w, h);

      const timeShift = now * 0.00004;
      const cols = Math.ceil(w / SAMPLE_STEP) + 1;
      const rows = Math.ceil(h / SAMPLE_STEP) + 1;

      // Sample height field
      const field: number[][] = [];
      for (let r = 0; r < rows; r++) {
        field[r] = [];
        for (let c = 0; c < cols; c++) {
          const nx = c * SAMPLE_STEP / w * 8 + timeShift;
          const ny = r * SAMPLE_STEP / h * 6 + timeShift * 0.7;
          field[r][c] = fbm(nx, ny);
        }
      }

      // Marching squares for contour lines
      // Use CSS variable for color via getComputedStyle
      const style = getComputedStyle(document.documentElement);
      const textColor = style.getPropertyValue('--el-page-text').trim() || '#888888';

      for (let level = 1; level < CONTOUR_LEVELS; level++) {
        const threshold = level * LINE_SPACING;
        const alpha = 0.10 + (level % 3 === 0 ? 0.08 : 0);

        ctx.strokeStyle = textColor;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = level % 3 === 0 ? 2 : 1;
        ctx.beginPath();

        for (let r = 0; r < rows - 1; r++) {
          for (let c = 0; c < cols - 1; c++) {
            const tl = field[r][c] >= threshold ? 1 : 0;
            const tr = field[r][c + 1] >= threshold ? 1 : 0;
            const br = field[r + 1][c + 1] >= threshold ? 1 : 0;
            const bl = field[r + 1][c] >= threshold ? 1 : 0;
            const cellCase = tl * 8 + tr * 4 + br * 2 + bl;

            if (cellCase === 0 || cellCase === 15) continue;

            const x = c * SAMPLE_STEP;
            const y = r * SAMPLE_STEP;
            const s = SAMPLE_STEP;

            // Interpolation helpers
            const interpTop = () => {
              const t = (threshold - field[r][c]) / (field[r][c + 1] - field[r][c]);
              return x + t * s;
            };
            const interpBottom = () => {
              const t = (threshold - field[r + 1][c]) / (field[r + 1][c + 1] - field[r + 1][c]);
              return x + t * s;
            };
            const interpLeft = () => {
              const t = (threshold - field[r][c]) / (field[r + 1][c] - field[r][c]);
              return y + t * s;
            };
            const interpRight = () => {
              const t = (threshold - field[r][c + 1]) / (field[r + 1][c + 1] - field[r][c + 1]);
              return y + t * s;
            };

            // Draw line segments based on marching squares case
            const drawSeg = (x1: number, y1: number, x2: number, y2: number) => {
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
            };

            switch (cellCase) {
              case 1: case 14: drawSeg(x, interpLeft(), interpBottom(), y + s); break;
              case 2: case 13: drawSeg(interpBottom(), y + s, x + s, interpRight()); break;
              case 3: case 12: drawSeg(x, interpLeft(), x + s, interpRight()); break;
              case 4: case 11: drawSeg(interpTop(), y, x + s, interpRight()); break;
              case 5:
                drawSeg(x, interpLeft(), interpTop(), y);
                drawSeg(interpBottom(), y + s, x + s, interpRight());
                break;
              case 6: case 9: drawSeg(interpTop(), y, interpBottom(), y + s); break;
              case 7: case 8: drawSeg(x, interpLeft(), interpTop(), y); break;
              case 10:
                drawSeg(x, interpLeft(), interpBottom(), y + s);
                drawSeg(interpTop(), y, x + s, interpRight());
                break;
            }
          }
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

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
