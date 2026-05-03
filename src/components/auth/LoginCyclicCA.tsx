import { useEffect, useRef } from 'react';

/**
 * Cyclic Cellular Automaton — standard implementation.
 * N color states (0..N-1). A cell is consumed by the next state in the cycle
 * if at least one neighbor is that next state. Creates spiraling pinwheel patterns.
 */

const CELL_SIZE = 5;
const STEP_INTERVAL = 100;
const NUM_STATES = 16;
const THRESHOLD = 1; // min neighbors of next state to consume

// Palette — evenly spaced hues
function stateToColor(state: number): string {
  const hue = (state / NUM_STATES) * 360;
  return `hsl(${hue}, 60%, 55%)`;
}

function createGrid(cols: number, rows: number): Uint8Array {
  const grid = new Uint8Array(cols * rows);
  for (let i = 0; i < grid.length; i++) {
    grid[i] = Math.floor(Math.random() * NUM_STATES);
  }
  return grid;
}

function step(grid: Uint8Array, cols: number, rows: number): Uint8Array {
  const next = new Uint8Array(cols * rows);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const idx = y * cols + x;
      const current = grid[idx];
      const successor = (current + 1) % NUM_STATES;

      // Count neighbors with the successor state (Von Neumann + Moore)
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = (x + dx + cols) % cols;
          const ny = (y + dy + rows) % rows;
          if (grid[ny * cols + nx] === successor) count++;
        }
      }

      next[idx] = count >= THRESHOLD ? successor : current;
    }
  }

  return next;
}

export function LoginCyclicCA() {
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

    // Pre-compute colors
    const colors = Array.from({ length: NUM_STATES }, (_, i) => stateToColor(i));

    function draw(now: number) {
      const w = canvas!.width;
      const h = canvas!.height;

      if (now - lastStep > STEP_INTERVAL) {
        lastStep = now;
        grid = step(grid, cols, rows);
      }

      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = 0.35;

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const state = grid[y * cols + x];
          ctx.fillStyle = colors[state];
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
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
