import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  rotation: number;
  rotationSpeed: number;
}

const COLORS = ['#7c3aed', '#3b82f6', '#e2b714', '#22c55e', '#ec4899', '#f59e0b', '#14b8a6'];

interface BingoConfettiProps {
  score: number;
  onDone?: () => void;
}

export function BingoConfetti({ score, onDone }: BingoConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
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

    const particles: Particle[] = [];
    for (let i = 0; i < 400; i++) {
      const maxLife = 60 + Math.random() * 60;
      particles.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * 100,
        vx: (Math.random() - 0.5) * 8,
        vy: 1 + Math.random() * 4,
        size: 4 + Math.random() * 8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        life: 0,
        maxLife,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
      });
    }
    particlesRef.current = particles;

    let done = false;
    function animate() {
      if (!ctx || !canvas) return;
      const elapsed = (performance.now() - startTimeRef.current) / 1000;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(1.0, elapsed * 2) * 0.35})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      let allDead = true;
      for (const p of particles) {
        if (p.life >= p.maxLife) continue;
        allDead = false;
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.rotation += p.rotationSpeed;

        const alpha = 1 - p.life / p.maxLife;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }

      const textOpacity = elapsed < 3.5 ? 1.0 : Math.max(0, 1.0 - (elapsed - 3.5) * 2);
      if (textOpacity > 0 && !allDead) {
        const scale = Math.min(1.0, elapsed / 0.3);

        ctx.save();
        ctx.globalAlpha = textOpacity;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.shadowColor = '#7c3aed';
        ctx.shadowBlur = 12;
        ctx.font = `bold ${56 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
        const gradient = ctx.createLinearGradient(canvas.width / 2 - 100, 0, canvas.width / 2 + 100, 0);
        gradient.addColorStop(0, '#7c3aed');
        gradient.addColorStop(0.5, '#3b82f6');
        gradient.addColorStop(1, '#ec4899');
        ctx.fillStyle = gradient;
        ctx.fillText('BINGO!', canvas.width / 2, canvas.height / 2 - 40 * scale);

        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 6;
        ctx.font = `bold ${30 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`+${score} pts`, canvas.width / 2, canvas.height / 2 + 30 * scale);

        ctx.restore();
      }

      if (!allDead) {
        animRef.current = requestAnimationFrame(animate);
      } else if (!done) {
        done = true;
        onDone?.();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      } else if (elapsed >= 4.5) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [score, onDone]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    />
  );
}
