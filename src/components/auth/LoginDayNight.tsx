import { useEffect, useRef } from 'react';

/**
 * Day & Night — standard implementation.
 * Like GoL but symmetric: birth with 3,6,7,8 neighbors; survival with 3,4,6,7,8.
 * Same patterns work with colors inverted.
 */

const CELL_SIZE = 6;
const STEP_INTERVAL = 200;

// Birth: 3,6,7,8 — Survival: 3,4,6,7,8
const BIRTH = new Set([3, 6, 7, 8]);
const SURVIVE = new Set([3, 4, 6, 7, 8]);

function createGrid(cols: number, rows: number): Uint8Array {
  const grid = new Uint8Array(cols * rows);
  for (let i = 0; i < grid.length; i++) {
    grid[i] = Math.random() < 0.5 ? 1 : 0;
  }
  return grid;
}

function step(grid: Uint8Array, cols: number, rows: number): Uint8Array {
  const next = new Uint8Array(cols * rows);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let neighbors = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = (x + dx + cols) % cols;
          const ny = (y + dy + rows) % rows;
          neighbors += grid[ny * cols + nx];
        }
      }

      const idx = y * cols + x;
      if (grid[idx]) {
        next[idx] = SURVIVE.has(neighbors) ? 1 : 0;
      } else {
        next[idx] = BIRTH.has(neighbors) ? 1 : 0;
      }
    }
  }

  return next;
}

export function LoginDayNight() {
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

    const cols = Math.ceil(canvas.width / CELL_SIZE);
    const rows = Math.ceil(canvas.height / CELL_SIZE);
    let grid = createGrid(cols, rows);
    let lastStep = performance.now();

    function getCellColor(): string {
      return getComputedStyle(document.documentElement)
        .getPropertyValue('--el-page-text').trim() || '#333333';
    }

    function draw(now: number) {
      const w = canvas!.width;
      const h = canvas!.height;

      if (now - lastStep > STEP_INTERVAL) {
        lastStep = now;
        grid = step(grid, cols, rows);
      }

      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = getCellColor();

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (grid[y * cols + x]) {
            ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
          }
        }
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
