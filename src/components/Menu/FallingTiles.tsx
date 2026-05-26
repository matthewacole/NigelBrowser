import { useEffect, useRef } from 'react';

const COLORS = ['#7c3aed', '#3b82f6', '#ec4899', '#22c55e', '#e2b714'];

interface FallingParticle {
  x: number;
  y: number;
  size: number;
  color: string;
  speed: number;
  drift: number;
  period: number;
  opacity: number;
}

export function FallingTiles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    startTimeRef.current = performance.now();

    const particles: FallingParticle[] = [];
    for (let i = 0; i < 30; i++) {
      const hash = i * 0.381966011250105;
      const xStart = (hash % 1) * canvas.width;
      const speed = 25 + (hash * 30) % 35;
      const drift = (hash * 200) % 40 - 20;
      const period = (hash * 20) % 10 + 8;
      particles.push({
        x: xStart,
        y: 0,
        size: 50 + (hash * 20) % 30,
        color: COLORS[Math.floor((hash * 100) % COLORS.length)],
        speed,
        drift,
        period,
        opacity: 0.6,
      });
    }

    function animate() {
      if (!ctx || !canvas) return;
      const elapsed = (performance.now() - startTimeRef.current) / 1000;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        const wrappedY = (elapsed * p.speed) % (canvas.height + 80) - 40;
        const xPos = p.x + p.drift * Math.sin(elapsed * 2 * Math.PI / p.period);
        const size = p.size;

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.translate(xPos, wrappedY);
        ctx.rotate(elapsed * 0.3);
        const r = size * 0.15;
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.lineTo(size - r, 0);
        ctx.quadraticCurveTo(size, 0, size, r);
        ctx.lineTo(size, size - r);
        ctx.quadraticCurveTo(size, size, size - r, size);
        ctx.lineTo(r, size);
        ctx.quadraticCurveTo(0, size, 0, size - r);
        ctx.lineTo(0, r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      animRef.current = requestAnimationFrame(animate);
    }

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.18,
        pointerEvents: 'none',
        filter: 'blur(4px)',
      }}
    />
  );
}
