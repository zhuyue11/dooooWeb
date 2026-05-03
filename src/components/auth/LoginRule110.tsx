import { useEffect, useRef } from 'react';

/**
 * Rule 110 — elementary cellular automaton.
 * 1D automaton rendered row by row, scrolling down.
 * Rule 110 is Turing-complete.
 */

const CELL_SIZE = 4;
const STEP_INTERVAL = 60;

// Rule 110 lookup: index = (left << 2 | center << 1 | right), value = new state
// 110 in binary = 01101110
const RULE = [0, 1, 1, 1, 0, 1, 1, 0];

export function LoginRule110() {
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
    const maxRows = Math.ceil(canvas.height / CELL_SIZE);

    // Initialize first row — single cell in the middle
    let currentRow = new Uint8Array(cols);
    currentRow[Math.floor(cols / 2)] = 1;

    const rows: Uint8Array[] = [currentRow];
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

        // Compute next row
        const prev = rows[rows.length - 1];
        const next = new Uint8Array(cols);
        for (let x = 0; x < cols; x++) {
          const left = prev[(x - 1 + cols) % cols];
          const center = prev[x];
          const right = prev[(x + 1) % cols];
          const pattern = (left << 2) | (center << 1) | right;
          next[x] = RULE[pattern];
        }
        rows.push(next);

        // When we fill the screen, restart with a new random seed
        if (rows.length > maxRows) {
          rows.length = 0;
          const newRow = new Uint8Array(cols);
          // Random initial row for variety
          for (let i = 0; i < cols; i++) {
            newRow[i] = Math.random() < 0.03 ? 1 : 0;
          }
          newRow[Math.floor(cols / 2)] = 1;
          rows.push(newRow);
        }
      }

      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = getCellColor();

      for (let y = 0; y < rows.length; y++) {
        const row = rows[y];
        for (let x = 0; x < cols; x++) {
          if (row[x]) {
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
