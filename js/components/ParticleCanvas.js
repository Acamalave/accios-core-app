export class ParticleCanvas {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.mouse = { x: -1000, y: -1000 };
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.running = true;

    this.resize();
    this.createParticles();
    this.animate();

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX * this.dpr;
      this.mouse.y = e.clientY * this.dpr;
    });
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
  }

  createParticles() {
    // Fewer particles on mobile for performance
    const isMobile = window.innerWidth < 768;
    const count = isMobile ? 30 : 60;

    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.4 + 0.1,
      });
    }
  }

  animate() {
    if (!this.running) return;
    requestAnimationFrame(() => this.animate());

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around
      if (p.x < 0) p.x = this.canvas.width;
      if (p.x > this.canvas.width) p.x = 0;
      if (p.y < 0) p.y = this.canvas.height;
      if (p.y > this.canvas.height) p.y = 0;

      // Draw particle
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius * this.dpr, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(167, 139, 250, ${p.alpha})`;
      this.ctx.fill();
    }

    // Draw connections
    const maxDist = 120 * this.dpr;
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.15;
          this.ctx.beginPath();
          this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
          this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
          this.ctx.strokeStyle = `rgba(124, 58, 237, ${alpha})`;
          this.ctx.lineWidth = 0.5 * this.dpr;
          this.ctx.stroke();
        }
      }
    }
  }

  destroy() {
    this.running = false;
  }
}
