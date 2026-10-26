import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  shape: 'rect' | 'circle' | 'star' | 'cross';
  rotation: number;
  rotationSpeed: number;
  tilt: number;
  tiltSpeed: number;
  opacity: number;
}

const CELEBRATION_COLORS = [
  '#C68B23', // Church Gold
  '#E5A638', // Sunrise Gold
  '#F6C45E', // Gold Glow
  '#D95D39', // Coptic Coral
  '#EB7958', // Warm Coral
  '#144E5B', // Deep Teal
  '#216F80', // Light Teal
  '#10B981', // Emerald Victory
  '#059669', // Deep Emerald
  '#6F1D2A', // Burgundy
  '#FAF5EB', // Ivory/Cream
  '#FFFFFF'  // Pure White
];

export const ConfettiCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let isSpawning = true;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Responsive particle count: 120 on small screens, 200 on desktop
    const maxParticles = width < 640 ? 120 : 200;
    const particles: Particle[] = [];

    const createParticle = (originX?: number, originY?: number, isBurst = false): Particle => {
      const colors = CELEBRATION_COLORS;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const shapes: Particle['shape'][] = ['rect', 'rect', 'circle', 'star', 'cross'];
      const shape = shapes[Math.floor(Math.random() * shapes.length)];

      const x = originX !== undefined ? originX : Math.random() * width;
      const y = originY !== undefined ? originY : -20;

      // Realistic celebratory explosion / fountain trajectory
      let vx = (Math.random() - 0.5) * 6;
      let vy = isBurst ? -(Math.random() * 12 + 6) : Math.random() * 3 + 2;
      if (originX !== undefined) {
        // Bias bursts inward toward center
        if (originX < width / 2) {
          vx = Math.random() * 8 + 2;
        } else if (originX > width / 2) {
          vx = -(Math.random() * 8 + 2);
        }
      }

      return {
        x,
        y,
        vx,
        vy,
        size: Math.random() * 8 + 6,
        color,
        shape,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 8,
        tilt: Math.random() * 10,
        tiltSpeed: Math.random() * 0.1 + 0.05,
        opacity: 1
      };
    };

    // Initial festive dual cannons from lower corners
    for (let i = 0; i < maxParticles * 0.4; i++) {
      particles.push(createParticle(width * 0.15, height * 0.85, true));
      particles.push(createParticle(width * 0.85, height * 0.85, true));
    }

    // Stop spawning new particles after 3.8 seconds so screen settles cleanly
    const stopSpawnTimer = setTimeout(() => {
      isSpawning = false;
    }, 3800);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Top up falling particles while spawning
      if (isSpawning && particles.length < maxParticles) {
        particles.push(createParticle(Math.random() * width, -15, false));
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.18; // gravity
        p.vx *= 0.99; // drag
        p.rotation += p.rotationSpeed;
        p.tilt += p.tiltSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.scale(Math.cos(p.tilt), 1);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'star') {
          // Draw 5-pointed star
          ctx.beginPath();
          const spikes = 5;
          const outerRadius = p.size * 0.6;
          const innerRadius = outerRadius * 0.5;
          let rot = (Math.PI / 2) * 3;
          let step = Math.PI / spikes;

          ctx.moveTo(0, -outerRadius);
          for (let s = 0; s < spikes; s++) {
            let sx = Math.cos(rot) * outerRadius;
            let sy = Math.sin(rot) * outerRadius;
            ctx.lineTo(sx, sy);
            rot += step;

            sx = Math.cos(rot) * innerRadius;
            sy = Math.sin(rot) * innerRadius;
            ctx.lineTo(sx, sy);
            rot += step;
          }
          ctx.lineTo(0, -outerRadius);
          ctx.closePath();
          ctx.fill();
        } else if (p.shape === 'cross') {
          // Draw Coptic Cross ☩
          const beamWidth = p.size * 0.28;
          const beamLen = p.size;
          ctx.fillRect(-beamWidth / 2, -beamLen / 2, beamWidth, beamLen);
          ctx.fillRect(-beamLen / 2, -beamWidth / 2, beamLen, beamWidth);
        }

        ctx.restore();

        // Remove offscreen particles
        if (p.y > height + 40 || p.x < -40 || p.x > width + 40) {
          particles.splice(i, 1);
        }
      }

      if (particles.length > 0 || isSpawning) {
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);

    // Pristine cleanup on unmount or when results screen closes
    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(stopSpawnTimer);
      window.removeEventListener('resize', handleResize);
      ctx.clearRect(0, 0, width, height);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50 w-full h-full select-none"
      style={{
        pointerEvents: 'none',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999
      }}
      aria-hidden="true"
    />
  );
};
