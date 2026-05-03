import { useEffect, useRef } from 'react';

/**
 * Langton's Ant — standard implementation.
 * Ant on a grid: on white, turn right, flip, move. On black, turn left, flip, move.
 */

const CELL_SIZE = 6;
const STEPS_PER_FRAME = 100;

export function LoginLangtonsAnt() {
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
    const grid = new Uint8Array(cols * rows); // 0=white, 1=black

    // Directions: 0=up, 1=right, 2=down, 3=left
    // Start just to the right of the centered 420px login panel
    const panelRightEdgePx = (canvas.width + 800) / 2;
    let antX = Math.floor(panelRightEdgePx / CELL_SIZE) + 2;
    let antY = Math.floor(rows / 2);
    let antDir = 0;

    const DX = [0, 1, 0, -1];
    const DY = [-1, 0, 1, 0];

    function getCellColor(): string {
      return getComputedStyle(document.documentElement)
        .getPropertyValue('--el-page-text').trim() || '#333333';
    }

    function draw() {
      const w = canvas!.width;
      const h = canvas!.height;

      // Run multiple steps per frame
      for (let s = 0; s < STEPS_PER_FRAME; s++) {
        const idx = antY * cols + antX;

        if (grid[idx] === 0) {
          // On white: turn right, flip to black, move
          antDir = (antDir + 1) % 4;
          grid[idx] = 1;
        } else {
          // On black: turn left, flip to white, move
          antDir = (antDir + 3) % 4;
          grid[idx] = 0;
        }

        antX = (antX + DX[antDir] + cols) % cols;
        antY = (antY + DY[antDir] + rows) % rows;
      }

      // Redraw
      ctx.clearRect(0, 0, w, h);
      const cellColor = getCellColor();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = cellColor;

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (grid[y * cols + x]) {
            ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
          }
        }
      }

      // Draw ant
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#f87171';
      ctx.fillRect(antX * CELL_SIZE, antY * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);

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
