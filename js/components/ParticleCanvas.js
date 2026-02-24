export class ParticleCanvas {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.mouse = { x: -1000, y: -1000 };
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.running = true;
    this.time = 0; // global time for independent drift

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
    const isMobile = window.innerWidth < 768;
    const count = isMobile ? 35 : 70;

    this.particles = [];
    for (let i = 0; i < count; i++) {
      // Each particle has a depth layer (0 = far, 1 = near)
      const depth = Math.random();
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        // Base velocity — deeper particles move slower (parallax)
        vx: (Math.random() - 0.5) * 0.2 * (0.3 + depth * 0.7),
        vy: (Math.random() - 0.5) * 0.2 * (0.3 + depth * 0.7),
        radius: (Math.random() * 1.2 + 0.4) * (0.5 + depth * 0.5),
        alpha: (Math.random() * 0.3 + 0.05) * (0.4 + depth * 0.6),
        depth,
        // Independent drift phase for organic movement
        driftPhase: Math.random() * Math.PI * 2,
        driftSpeed: 0.003 + Math.random() * 0.005,
        driftAmp: 0.15 + Math.random() * 0.3,
        // Twinkle
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.01 + Math.random() * 0.02,
      });
    }
  }

  animate() {
    if (!this.running) return;
    requestAnimationFrame(() => this.animate());

    this.time++;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (const p of this.particles) {
      // Independent sinusoidal drift (creates organic floating feel)
      const driftX = Math.sin(this.time * p.driftSpeed + p.driftPhase) * p.driftAmp;
      const driftY = Math.cos(this.time * p.driftSpeed * 0.7 + p.driftPhase) * p.driftAmp;

      p.x += p.vx + driftX;
      p.y += p.vy + driftY;

      // Wrap around
      if (p.x < -10) p.x = this.canvas.width + 10;
      if (p.x > this.canvas.width + 10) p.x = -10;
      if (p.y < -10) p.y = this.canvas.height + 10;
      if (p.y > this.canvas.height + 10) p.y = -10;

      // Twinkle effect — pulsing alpha
      const twinkle = Math.sin(this.time * p.twinkleSpeed + p.twinklePhase);
      const currentAlpha = p.alpha * (0.6 + twinkle * 0.4);

      // Draw particle
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius * this.dpr, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(167, 139, 250, ${currentAlpha.toFixed(3)})`;
      this.ctx.fill();
    }

    // Draw connections (only between particles at similar depths)
    const maxDist = 100 * this.dpr;
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const a = this.particles[i];
        const b = this.particles[j];

        // Only connect particles at similar depth layers
        if (Math.abs(a.depth - b.depth) > 0.35) continue;

        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.1 * Math.min(a.depth, b.depth);
          this.ctx.beginPath();
          this.ctx.moveTo(a.x, a.y);
          this.ctx.lineTo(b.x, b.y);
          this.ctx.strokeStyle = `rgba(124, 58, 237, ${alpha.toFixed(4)})`;
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
