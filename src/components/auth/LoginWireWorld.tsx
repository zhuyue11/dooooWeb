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
  const set = (x: number, y: number, v: number) => {
    if (x >= 0 && x < cols && y >= 0 && y < rows) grid[y * cols + x] = v;
  };
  const wire = (x: number, y: number) => set(x, y, 1);

  // Helper: draw a horizontal wire segment
  const hLine = (x0: number, x1: number, y: number) => {
    const lo = Math.min(x0, x1), hi = Math.max(x0, x1);
    for (let x = lo; x <= hi; x++) wire(x, y);
  };
  // Helper: draw a vertical wire segment
  const vLine = (x: number, y0: number, y1: number) => {
    const lo = Math.min(y0, y1), hi = Math.max(y0, y1);
    for (let y = lo; y <= hi; y++) wire(x, y);
  };
  // Helper: draw a rectangular loop
  const loop = (x: number, y: number, w: number, h: number) => {
    hLine(x, x + w, y);
    hLine(x, x + w, y + h);
    vLine(x, y, y + h);
    vLine(x + w, y, y + h);
  };
  // Helper: place an electron moving rightward along a horizontal wire
  const electronH = (x: number, y: number) => {
    set(x, y, 2);     // head
    set(x - 1, y, 3); // tail behind it
  };
  // Helper: place an electron moving downward along a vertical wire
  const electronV = (x: number, y: number) => {
    set(x, y, 2);     // head
    set(x, y - 1, 3); // tail above it
  };

  // Spacing for the grid of circuits
  const spacingX = Math.max(20, Math.floor(cols / 6));
  const spacingY = Math.max(16, Math.floor(rows / 5));

  // 1) Rectangular loops across the grid
  for (let gy = 0; gy < 5; gy++) {
    for (let gx = 0; gx < 6; gx++) {
      const bx = gx * spacingX + Math.floor(rand() * 4) - 2;
      const by = gy * spacingY + Math.floor(rand() * 4) - 2;
      const w = 8 + Math.floor(rand() * (spacingX - 12));
      const h = 6 + Math.floor(rand() * (spacingY - 10));
      loop(bx, by, w, h);
    }
  }

  // 2) Horizontal bus lines connecting loops
  for (let i = 0; i < 6; i++) {
    const y = Math.floor(spacingY * (0.5 + i * 0.9)) + Math.floor(rand() * 3);
    if (y >= 0 && y < rows) hLine(0, cols - 1, y);
  }

  // 3) Vertical bus lines connecting loops
  for (let i = 0; i < 8; i++) {
    const x = Math.floor(spacingX * (0.3 + i * 0.8)) + Math.floor(rand() * 3);
    if (x >= 0 && x < cols) vLine(x, 0, rows - 1);
  }

  // 4) Random branch wires for organic feel
  for (let i = 0; i < 40; i++) {
    let x = Math.floor(rand() * cols);
    let y = Math.floor(rand() * rows);
    const len = 10 + Math.floor(rand() * 30);
    const biasDir = Math.floor(rand() * 4);
    for (let j = 0; j < len; j++) {
      wire(x, y);
      const dir = rand() < 0.6 ? biasDir : Math.floor(rand() * 4);
      if (dir === 0) x++;
      else if (dir === 1) x--;
      else if (dir === 2) y++;
      else y--;
      x = ((x % cols) + cols) % cols;
      y = ((y % rows) + rows) % rows;
    }
  }

  // 5) Seed electrons on horizontal and vertical wire runs
  for (let y = 0; y < rows; y++) {
    for (let x = 2; x < cols; x++) {
      const idx = y * cols + x;
      if (grid[idx] === 1 && grid[idx - 1] === 1 && grid[idx - 2] === 1) {
        if (rand() < 0.015) electronH(x, y);
      }
    }
  }
  for (let x = 0; x < cols; x++) {
    for (let y = 2; y < rows; y++) {
      const idx = y * cols + x;
      if (grid[idx] === 1 && grid[(y - 1) * cols + x] === 1 && grid[(y - 2) * cols + x] === 1) {
        if (rand() < 0.008) electronV(x, y);
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

    function draw(now: number) {
      const w = canvas!.width;
      const h = canvas!.height;

      if (now - lastStep > STEP_INTERVAL) {
        lastStep = now;
        grid = step(grid, cols, rows);
      }

      ctx.clearRect(0, 0, w, h);

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const state = grid[y * cols + x];
          if (state === 0) continue;

          if (state === 1) {
            // Wire (conductor) — yellow
            ctx.globalAlpha = 0.12;
            ctx.fillStyle = '#facc15';
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
