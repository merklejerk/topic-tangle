export interface AnimationHandler {
  init: () => void;
  animate: () => void;
  cleanup: () => void;
}

// Confetti animation constants
const PARTICLE_COUNT = 128;
const TARGET_FPS = 48;
const FRAME_INTERVAL = 1000 / TARGET_FPS;
const FALL_SPEED = 60;

// Particle appearance constants
const MIN_PARTICLE_SIZE = 3;
const MAX_PARTICLE_SIZE = 16;
const MIN_LIGHTNESS = 50;
const MAX_LIGHTNESS = 80; // 50 + 30
const OPACITY_DECAY_RATE = 0.3; // opacity decrease per second

// Particle movement constants
const HORIZONTAL_SPEED_RANGE = 3; // -1.5 to +1.5 * FALL_SPEED
const MIN_VERTICAL_SPEED = 2; // * FALL_SPEED
const MAX_VERTICAL_SPEED = 7; // 2 + 5 * FALL_SPEED
const MAX_ROTATION_SPEED = 4; // -2 to +2 * PI radians per second

// Shape constants
const TRIANGLE_HEIGHT_RATIO = 0.866; // Math.sqrt(3)/2 for equilateral triangle
const STAR_SPIKES = 5;
const STAR_INNER_RATIO = 0.5; // inner radius = outer radius * 0.5

type ParticleShape = 'circle' | 'rectangle' | 'triangle' | 'star' | 'diamond';

class Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  speedX: number;
  speedY: number;
  opacity: number;
  shape: ParticleShape;
  rotation: number;
  rotationSpeed: number;

  constructor() {
    this.x = Math.random() * window.innerWidth;
    this.y = Math.random() * window.innerHeight * 2 - window.innerHeight;
    this.size = Math.random() * (MAX_PARTICLE_SIZE - MIN_PARTICLE_SIZE) + MIN_PARTICLE_SIZE;
    this.color = `hsl(${Math.random() * 360}, 100%, ${MIN_LIGHTNESS + Math.random() * (MAX_LIGHTNESS - MIN_LIGHTNESS)}%)`;
    this.speedX = (Math.random() * HORIZONTAL_SPEED_RANGE - HORIZONTAL_SPEED_RANGE / 2) * FALL_SPEED;
    this.speedY = (Math.random() * (MAX_VERTICAL_SPEED - MIN_VERTICAL_SPEED) + MIN_VERTICAL_SPEED) * FALL_SPEED;
    this.opacity = 1;
    
    // Random shape selection
    const shapes: ParticleShape[] = ['circle', 'rectangle', 'triangle', 'star', 'diamond'];
    this.shape = shapes[Math.floor(Math.random() * shapes.length)];
    
    // Random rotation and rotation speed for dynamic movement
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() * MAX_ROTATION_SPEED - MAX_ROTATION_SPEED / 2) * Math.PI;
  }

  update(deltaTime: number) {
    const dt = deltaTime / 1000; // convert to seconds
    this.x += this.speedX * dt;
    this.y += this.speedY * dt;
    this.rotation += this.rotationSpeed * dt;
    
    if (this.y > window.innerHeight) {
      this.y = Math.random() * -window.innerHeight;
      this.x = Math.random() * window.innerWidth;
      this.opacity = 1;
    }
    this.opacity -= OPACITY_DECAY_RATE * dt;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1;
    
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    
    switch (this.shape) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        break;
        
      case 'rectangle':
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        break;
        
      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(0, -this.size);
        ctx.lineTo(-this.size * TRIANGLE_HEIGHT_RATIO, this.size / 2);
        ctx.lineTo(this.size * TRIANGLE_HEIGHT_RATIO, this.size / 2);
        ctx.closePath();
        ctx.fill();
        break;
        
      case 'star':
        this.drawStar(ctx, 0, 0, STAR_SPIKES, this.size, this.size * STAR_INNER_RATIO);
        break;
        
      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(0, -this.size);
        ctx.lineTo(this.size, 0);
        ctx.lineTo(0, this.size);
        ctx.lineTo(-this.size, 0);
        ctx.closePath();
        ctx.fill();
        break;
    }
    
    ctx.restore();
  }
  
  private drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
    let rot = Math.PI / 2 * 3;
    const step = Math.PI / spikes;
    
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
      rot += step;
      
      ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
      rot += step;
    }
    
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }
}

export function createConfettiAnimation(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): AnimationHandler {
  let particles: Particle[] = [];
  let animationFrameId: number;
  let lastFrameTime = 0;

  function init() {
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(new Particle());
    }
  }

  function animate() {
    const currentTime = performance.now();
    
    if (currentTime - lastFrameTime >= FRAME_INTERVAL) {
      const deltaTime = currentTime - lastFrameTime;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.update(deltaTime);
        p.draw(ctx);
      });
      
      lastFrameTime = currentTime;
    }
    
    animationFrameId = requestAnimationFrame(animate);
  }

  function cleanup() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    particles = [];
  }

  return { init, animate, cleanup };
}
