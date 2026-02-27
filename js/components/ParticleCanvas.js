export class ParticleCanvas {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.mouse = { x: -1000, y: -1000 };
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.running = true;
    this.time = 0;

    // Mouse interaction config
    this.mouseRadius = 120 * this.dpr;  // radius of mouse influence
    this.mouseForce = 0.8;              // repulsion strength

    // Scroll-based parallax offsets
    this.scrollOffsetY = 0;
    this.gyroOffsetX = 0;
    this.gyroOffsetY = 0;

    this.resize();
    this.createParticles();
    this.animate();

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX * this.dpr;
      this.mouse.y = e.clientY * this.dpr;
    });
    window.addEventListener('mouseleave', () => {
      this.mouse.x = -1000;
      this.mouse.y = -1000;
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
    const count = isMobile ? 45 : 90;

    this.particles = [];
    for (let i = 0; i < count; i++) {
      const depth = Math.random();
      const baseRadius = (Math.random() * 1.4 + 0.3) * (0.4 + depth * 0.6);

      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        // Home position (for returning after mouse push)
        homeX: 0,
        homeY: 0,
        // Base velocity — deeper particles move slower (parallax)
        vx: (Math.random() - 0.5) * 0.18 * (0.3 + depth * 0.7),
        vy: (Math.random() - 0.5) * 0.18 * (0.3 + depth * 0.7),
        // Mouse push velocity
        pushVx: 0,
        pushVy: 0,
        radius: baseRadius,
        alpha: (Math.random() * 0.35 + 0.04) * (0.35 + depth * 0.65),
        depth,
        // Independent drift for organic movement
        driftPhase: Math.random() * Math.PI * 2,
        driftSpeed: 0.002 + Math.random() * 0.004,
        driftAmp: 0.12 + Math.random() * 0.25,
        // Twinkle
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.008 + Math.random() * 0.018,
        // Mouse interaction — bigger/closer stars react more
        mouseReactivity: 0.3 + depth * 0.7,
        // Star glow when disturbed
        excitation: 0,
      });
    }
  }

  animate() {
    if (!this.running) return;
    requestAnimationFrame(() => this.animate());

    this.time++;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const mouseX = this.mouse.x;
    const mouseY = this.mouse.y;
    const mouseR = this.mouseRadius;
    const mouseRSq = mouseR * mouseR;

    for (const p of this.particles) {
      // ─── Mouse interaction ───
      const dmx = p.x - mouseX;
      const dmy = p.y - mouseY;
      const distSq = dmx * dmx + dmy * dmy;

      if (distSq < mouseRSq && distSq > 0) {
        const dist = Math.sqrt(distSq);
        const force = (1 - dist / mouseR) * this.mouseForce * p.mouseReactivity;
        const angle = Math.atan2(dmy, dmx);

        // Push particles away from mouse
        p.pushVx += Math.cos(angle) * force;
        p.pushVy += Math.sin(angle) * force;

        // Excite the star (makes it glow brighter)
        p.excitation = Math.min(p.excitation + 0.08, 1);
      }

      // Dampen push velocity (particles slowly return)
      p.pushVx *= 0.94;
      p.pushVy *= 0.94;

      // Decay excitation
      p.excitation *= 0.97;

      // Independent sinusoidal drift
      const driftX = Math.sin(this.time * p.driftSpeed + p.driftPhase) * p.driftAmp;
      const driftY = Math.cos(this.time * p.driftSpeed * 0.7 + p.driftPhase) * p.driftAmp;

      // Parallax from scroll + gyroscope
      const parallaxFactor = 0.2 + p.depth * 0.8;
      const scrollPar = this.scrollOffsetY * parallaxFactor * 0.02;
      const gyroPX = this.gyroOffsetX * parallaxFactor * 0.5;
      const gyroPY = this.gyroOffsetY * parallaxFactor * 0.5;

      p.x += p.vx + driftX + p.pushVx + gyroPX;
      p.y += p.vy + driftY + p.pushVy + scrollPar + gyroPY;

      // Wrap around
      if (p.x < -10) p.x = this.canvas.width + 10;
      if (p.x > this.canvas.width + 10) p.x = -10;
      if (p.y < -10) p.y = this.canvas.height + 10;
      if (p.y > this.canvas.height + 10) p.y = -10;

      // Twinkle effect
      const twinkle = Math.sin(this.time * p.twinkleSpeed + p.twinklePhase);
      const baseAlpha = p.alpha * (0.6 + twinkle * 0.4);
      // Excited stars glow brighter
      const currentAlpha = Math.min(baseAlpha + p.excitation * 0.5, 1);

      // Draw radius — excited stars get slightly bigger
      const drawRadius = (p.radius + p.excitation * 0.8) * this.dpr;

      // ─── Draw star with glow ───
      // Outer glow (only when excited or for brighter stars)
      if (p.excitation > 0.05 || p.alpha > 0.15) {
        const glowRadius = drawRadius * (2.5 + p.excitation * 3);
        const glowAlpha = (currentAlpha * 0.15 + p.excitation * 0.25);
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167, 139, 250, ${glowAlpha.toFixed(4)})`;
        ctx.fill();
      }

      // Core star
      ctx.beginPath();
      ctx.arc(p.x, p.y, drawRadius, 0, Math.PI * 2);
      // Shift color toward white when excited
      const r = Math.round(167 + p.excitation * 88);
      const g = Math.round(139 + p.excitation * 116);
      const b = 250;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${currentAlpha.toFixed(3)})`;
      ctx.fill();
    }

    // Decay parallax offsets
    this.scrollOffsetY *= 0.9;
    this.gyroOffsetX *= 0.95;
    this.gyroOffsetY *= 0.95;

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
          const baseLineAlpha = (1 - dist / maxDist) * 0.08 * Math.min(a.depth, b.depth);
          // Lines glow when either particle is excited
          const excitedBoost = (a.excitation + b.excitation) * 0.12;
          const lineAlpha = baseLineAlpha + excitedBoost;

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(167, 139, 250, ${lineAlpha.toFixed(4)})`;
          ctx.lineWidth = (0.5 + (a.excitation + b.excitation) * 0.3) * this.dpr;
          ctx.stroke();
        }
      }
    }
  }

  // ─── Public: scroll-based parallax offset ───
  setScrollOffset(deltaY) {
    this.scrollOffsetY += deltaY;
  }

  // ─── Public: gyroscope-based parallax offset ───
  setGyroOffset(x, y) {
    this.gyroOffsetX = x;
    this.gyroOffsetY = y;
  }

  destroy() {
    this.running = false;
  }
}
