import { useEffect, useRef } from 'react';

interface ColdFogCanvasProps {
  active?: boolean;
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  alpha: number;
  maxAlpha: number;
  life: number;
  maxLife: number;
  color: string;
}

export function ColdFogCanvas({ active = true, intensity = 'medium', className = '' }: ColdFogCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 400);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600);

    const handleResize = () => {
      if (canvas && canvas.parentElement) {
        width = canvas.width = canvas.parentElement.clientWidth;
        height = canvas.height = canvas.parentElement.clientHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    const particleCount = intensity === 'high' ? 45 : intensity === 'medium' ? 30 : 18;
    const particles: Particle[] = [];

    const colors = [
      'rgba(230, 245, 255, ',  // Pure ice white
      'rgba(186, 230, 253, ',  // Soft cyan
      'rgba(224, 242, 254, ',  // Frost blue
      'rgba(255, 255, 255, ',  // Pure white fog
    ];

    const createParticle = (isInitial = false): Particle => {
      const maxLife = 120 + Math.random() * 140;
      return {
        x: Math.random() * width,
        y: isInitial ? Math.random() * height : height + 20,
        radius: 30 + Math.random() * 60,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -0.4 - Math.random() * 0.8,
        alpha: 0,
        maxAlpha: 0.12 + Math.random() * 0.22,
        life: isInitial ? Math.floor(Math.random() * maxLife) : 0,
        maxLife,
        color: colors[Math.floor(Math.random() * colors.length)],
      };
    };

    for (let i = 0; i < particleCount; i++) {
      particles.push(createParticle(true));
    }

    // Render loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Render frost fog particles
      particles.forEach((p, idx) => {
        p.life++;
        p.x += p.vx + Math.sin(p.life * 0.03) * 0.3;
        p.y += p.vy;

        // Fade in and out curve
        const progress = p.life / p.maxLife;
        if (progress < 0.2) {
          p.alpha = (progress / 0.2) * p.maxAlpha;
        } else if (progress > 0.7) {
          p.alpha = ((1 - progress) / 0.3) * p.maxAlpha;
        } else {
          p.alpha = p.maxAlpha;
        }

        if (p.life >= p.maxLife || p.y < -p.radius * 2) {
          particles[idx] = createParticle(false);
          return;
        }

        // Radial gradient particle puff
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        grad.addColorStop(0, `${p.color}${p.alpha})`);
        grad.addColorStop(0.5, `${p.color}${p.alpha * 0.5})`);
        grad.addColorStop(1, `${p.color}0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Render subtle ice sparkles
      if (Math.random() < 0.3) {
        const sx = Math.random() * width;
        const sy = Math.random() * height;
        const sRad = 1 + Math.random() * 1.5;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + Math.random() * 0.5})`;
        ctx.beginPath();
        ctx.arc(sx, sy, sRad, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [active, intensity]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 z-20 w-full h-full mix-blend-screen opacity-90 transition-opacity duration-1000 ${className}`}
    />
  );
}
