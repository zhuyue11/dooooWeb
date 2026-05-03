import { useEffect, useRef } from 'react';

/**
 * Wireworld — standard implementation.
 * 4 states: empty(0), wire(1), electron head(2), electron tail(3).
 * Head → tail. Tail → wire. Wire → head if exactly 1 or 2 head neighbors. Empty stays empty.
 */

const CELL_SIZE = 6;
const STEP_INTERVAL = 150;

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function createGrid(cols: number, rows: number): Uint8Array {
  const grid = new Uint8Array(cols * rows);
  const rand = seededRandom(99);

  // Create random wire paths
  const wireCount = 12 + Math.floor(rand() * 8);
  for (let w = 0; w < wireCount; w++) {
    let x = Math.floor(rand() * cols);
    let y = Math.floor(rand() * rows);
    const length = 30 + Math.floor(rand() * 80);

    for (let i = 0; i < length; i++) {
      if (x >= 0 && x < cols && y >= 0 && y < rows) {
        grid[y * cols + x] = 1; // wire
        // Place electron at start of some wires
        if (i === 0 && rand() < 0.5) {
          grid[y * cols + x] = 2; // head
        } else if (i === 1 && grid[(y * cols + x)] === 1 && rand() < 0.3) {
          // Check if previous was head
          const prevIdx = (y * cols + x);
          if (prevIdx >= 0) grid[prevIdx] = 3; // tail behind head
        }
      }
      // Random walk
      const dir = Math.floor(rand() * 4);
      if (dir === 0) x++;
      else if (dir === 1) x--;
      else if (dir === 2) y++;
      else y--;
      x = (x + cols) % cols;
      y = (y + rows) % rows;
    }
  }

  // Ensure some electrons exist
  let electronCount = 0;
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] === 2) electronCount++;
  }
  if (electronCount < 5) {
    for (let i = 0; i < grid.length && electronCount < 10; i++) {
      if (grid[i] === 1 && rand() < 0.02) {
        grid[i] = 2;
        electronCount++;
      }
    }
  }

  return grid;
}

function step(grid: Uint8Array, cols: number, rows: number): Uint8Array {
  const next = new Uint8Array(cols * rows);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const idx = y * cols + x;
      const state = grid[idx];

      if (state === 0) {
        next[idx] = 0; // empty stays empty
      } else if (state === 2) {
        next[idx] = 3; // head → tail
      } else if (state === 3) {
        next[idx] = 1; // tail → wire
      } else {
        // Wire: count head neighbors
        let heads = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = (x + dx + cols) % cols;
            const ny = (y + dy + rows) % rows;
            if (grid[ny * cols + nx] === 2) heads++;
          }
        }
        next[idx] = (heads === 1 || heads === 2) ? 2 : 1;
      }
    }
  }

  return next;
}

export function LoginWireWorld() {
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
      const cellColor = getCellColor();

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const state = grid[y * cols + x];
          if (state === 0) continue;

          if (state === 1) {
            // Wire
            ctx.globalAlpha = 0.12;
            ctx.fillStyle = cellColor;
          } else if (state === 2) {
            // Electron head
            ctx.globalAlpha = 0.6;
            ctx.fillStyle = '#38bdf8';
          } else {
            // Electron tail
            ctx.globalAlpha = 0.35;
            ctx.fillStyle = '#f87171';
          }

          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
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
