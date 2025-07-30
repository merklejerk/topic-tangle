import type { AnimationHandler } from './confetti';

// Lava lamp animation constants
const LAVA_INITIAL_BLOBS = 8;            // Number of blobs to start with
const LAVA_MIN_BLOBS = 16;               // Minimum blobs to maintain on screen
const LAVA_SPAWN_RATE = 8000;            // Blob spawn rate (ms) - slower spawning
const LAVA_MIN_SIZE_PERCENT = 0.1;       // Minimum blob size as % of screen area (1%)
const LAVA_MAX_SIZE_PERCENT = 0.25;      // Maximum blob size as % of screen area (6%)
const LAVA_MIN_OPACITY = 0.3;            // Minimum opacity
const LAVA_MAX_OPACITY = 0.7;            // Maximum opacity
const LAVA_SPEED = 20;                   // Movement speed (pixels per second)
const LAVA_MORPH_SPEED = 0.5;            // How fast blobs morph (cycles per second)
const LAVA_FADE_IN_TIME = 2;             // Fade in duration (seconds)
const LAVA_FADE_OUT_TIME = 3;            // Fade out duration (seconds)
const LAVA_EDGE_BUFFER_PERCENT = 0.15;   // Edge buffer as % of screen size (15%)
const TARGET_FPS = 48;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

class LavaBlob {
  x: number;
  y: number;
  baseSize: number;
  currentSize: number;
  color: string;
  baseOpacity: number;
  currentOpacity: number;
  speedX: number;
  speedY: number;
  morphPhase: number;
  morphSpeed: number;
  lifetime: number;
  maxLifetime: number;

  constructor() {
    // Calculate edge buffer based on screen size
    const edgeBufferX = window.innerWidth * LAVA_EDGE_BUFFER_PERCENT;
    const edgeBufferY = window.innerHeight * LAVA_EDGE_BUFFER_PERCENT;
    
    // Allow blobs to spawn outside the visible area
    this.x = Math.random() * (window.innerWidth + edgeBufferX * 2) - edgeBufferX;
    this.y = Math.random() * (window.innerHeight + edgeBufferY * 2) - edgeBufferY;
    
    // Size as fraction of canvas area
    const canvasArea = window.innerWidth * window.innerHeight;
    const sizeRange = LAVA_MAX_SIZE_PERCENT - LAVA_MIN_SIZE_PERCENT;
    const sizeArea = canvasArea * (Math.random() * sizeRange + LAVA_MIN_SIZE_PERCENT);
    this.baseSize = Math.sqrt(sizeArea / Math.PI);
    this.currentSize = this.baseSize;
    
    this.color = this.getRandomLavaColor();
    const opacityRange = LAVA_MAX_OPACITY - LAVA_MIN_OPACITY;
    this.baseOpacity = Math.random() * opacityRange + LAVA_MIN_OPACITY;
    this.currentOpacity = 0; // Start transparent for fade-in
    
    // Random movement direction
    const angle = Math.random() * Math.PI * 2;
    this.speedX = Math.cos(angle) * LAVA_SPEED;
    this.speedY = Math.sin(angle) * LAVA_SPEED;
    
    this.morphPhase = Math.random() * Math.PI * 2;
    this.morphSpeed = LAVA_MORPH_SPEED + Math.random() * 0.3; // slight variation
    
    this.lifetime = 0;
    this.maxLifetime = 30 + Math.random() * 20; // 30-50 seconds
  }

  private getRandomLavaColor(): string {
    const lavaColors = [
      '#ff4500', // orange red
      '#ff6347', // tomato
      '#ff1493', // deep pink
      '#ff69b4', // hot pink
      '#9370db', // medium purple
      '#8a2be2', // blue violet
      '#4169e1', // royal blue
      '#00ced1', // dark turquoise
      '#00ff7f', // spring green
      '#ffff00', // yellow
    ];
    return lavaColors[Math.floor(Math.random() * lavaColors.length)];
  }

  update(deltaTime: number) {
    const dt = deltaTime / 1000;
    
    // Update position
    this.x += this.speedX * dt;
    this.y += this.speedY * dt;
    
    // Calculate edge buffer based on current screen size
    const edgeBufferX = window.innerWidth * LAVA_EDGE_BUFFER_PERCENT;
    const edgeBufferY = window.innerHeight * LAVA_EDGE_BUFFER_PERCENT;
    
    // Softer bouncing with extended boundaries
    const leftBound = -edgeBufferX;
    const rightBound = window.innerWidth + edgeBufferX;
    const topBound = -edgeBufferY;
    const bottomBound = window.innerHeight + edgeBufferY;
    
    if (this.x <= leftBound || this.x >= rightBound) {
      this.speedX *= -0.7; // More dampening for softer bounces
      this.x = Math.max(leftBound, Math.min(rightBound, this.x));
    }
    if (this.y <= topBound || this.y >= bottomBound) {
      this.speedY *= -0.7;
      this.y = Math.max(topBound, Math.min(bottomBound, this.y));
    }
    
    // Update morphing
    this.morphPhase += this.morphSpeed * dt;
    this.currentSize = this.baseSize * (1 + 0.3 * Math.sin(this.morphPhase));
    
    // Update lifetime
    this.lifetime += dt;
    
    // Calculate fade-in/fade-out opacity
    const fadeOutStart = this.maxLifetime - LAVA_FADE_OUT_TIME;
    
    if (this.lifetime < LAVA_FADE_IN_TIME) {
      // Fade in
      const fadeProgress = this.lifetime / LAVA_FADE_IN_TIME;
      this.currentOpacity = this.baseOpacity * fadeProgress;
    } else if (this.lifetime > fadeOutStart) {
      // Fade out
      const fadeProgress = (this.maxLifetime - this.lifetime) / LAVA_FADE_OUT_TIME;
      this.currentOpacity = this.baseOpacity * Math.max(0, fadeProgress);
    } else {
      // Full opacity during middle of lifetime
      this.currentOpacity = this.baseOpacity;
    }
  }

  get isExpired(): boolean {
    // Calculate edge buffer based on current screen size
    const edgeBufferX = window.innerWidth * LAVA_EDGE_BUFFER_PERCENT;
    const edgeBufferY = window.innerHeight * LAVA_EDGE_BUFFER_PERCENT;
    
    // Expire if lifetime exceeded OR if blob has moved too far off-screen
    const tooFarOffScreen = (
      this.x < -edgeBufferX * 2 || 
      this.x > window.innerWidth + edgeBufferX * 2 ||
      this.y < -edgeBufferY * 2 || 
      this.y > window.innerHeight + edgeBufferY * 2
    );
    
    return this.lifetime > this.maxLifetime || tooFarOffScreen;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.currentOpacity > 0) {
      // Create multiple gradients for a more organic look
      const gradient = ctx.createRadialGradient(
        this.x, this.y, 0,
        this.x, this.y, this.currentSize
      );
      
      // More complex gradient for lava lamp effect
      gradient.addColorStop(0, `${this.color}${Math.floor(this.currentOpacity * 255).toString(16).padStart(2, '0')}`);
      gradient.addColorStop(0.4, `${this.color}${Math.floor(this.currentOpacity * 200).toString(16).padStart(2, '0')}`);
      gradient.addColorStop(0.7, `${this.color}${Math.floor(this.currentOpacity * 100).toString(16).padStart(2, '0')}`);
      gradient.addColorStop(1, `${this.color}00`);
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      
      // Draw slightly irregular blob shape
      const points = 8;
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const variation = 0.1 * Math.sin(this.morphPhase * 2 + angle * 3);
        const radius = this.currentSize * (1 + variation);
        const x = this.x + Math.cos(angle) * radius;
        const y = this.y + Math.sin(angle) * radius;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.closePath();
      ctx.fill();
    }
  }
}

export function createLavaLampAnimation(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): AnimationHandler {
  let lavaBlobs: LavaBlob[] = [];
  let animationFrameId: number;
  let lastFrameTime = 0;

  function init() {
    lavaBlobs = [];
    // Start with configured number of blobs
    for (let i = 0; i < LAVA_INITIAL_BLOBS; i++) {
      lavaBlobs.push(new LavaBlob());
    }
  }

  function animate() {
    const currentTime = performance.now();
    
    if (currentTime - lastFrameTime >= FRAME_INTERVAL) {
      const deltaTime = currentTime - lastFrameTime;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update existing blobs
      lavaBlobs.forEach(blob => {
        blob.update(deltaTime);
        blob.draw(ctx);
      });
      
      // Remove expired blobs
      lavaBlobs = lavaBlobs.filter(blob => !blob.isExpired);
      
      // Spawn new blobs based on configured rate (slower than neon lights)
      if (Math.random() < deltaTime / LAVA_SPAWN_RATE) {
        lavaBlobs.push(new LavaBlob());
      }
      
      // Ensure we always have minimum number of blobs
      if (lavaBlobs.length < LAVA_MIN_BLOBS) {
        lavaBlobs.push(new LavaBlob());
      }
      
      lastFrameTime = currentTime;
    }
    
    animationFrameId = requestAnimationFrame(animate);
  }

  function cleanup() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    lavaBlobs = [];
  }

  return { init, animate, cleanup };
}
