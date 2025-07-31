<script lang="ts">
	import { onDestroy } from 'svelte';

	export let particleFPS: number = 45;
	export let particleCount: number = 8;
	export let gravity: number = 300;
	export let horizontalSpread: number = 120;
	export let upwardVelocityMin: number = 120;
	export let upwardVelocityMax: number = 100;
	export let particleLifetime: number = 1.5e3;
	export let particleSizeMin: number = 0.75;
	export let particleSizeMax: number = 1;
	export let particleCharacter: string = '✨';
	export let enableTint: boolean = false;
	export let enableRotation: boolean = false;

	let particleContainer: HTMLDivElement;
	let activeAnimations: Set<ReturnType<typeof setTimeout>> = new Set();

	export function createParticleEffect(element: HTMLElement) {
		if (!particleContainer) return;

		const particles: Array<{
			element: HTMLDivElement;
			x: number;
			y: number;
			vx: number;
			vy: number;
			life: number;
			maxLife: number;
			size: number;
			rotation: number;
			rotationSpeed: number;
		}> = [];

		// Create multiple particles
		for (let i = 0; i < particleCount; i++) {
			const particle = document.createElement('div');
			particle.className = 'particle-effect-point';
			
			// Random physics values (pixels per second)
			const horizontalVelocity = (Math.random() - 0.5) * horizontalSpread;
			const initialUpwardVelocity = -upwardVelocityMin - Math.random() * upwardVelocityMax;
			
			// Set the character content and optional tint
			particle.textContent = particleCharacter;
			
			// Random tint using CSS filter
			if (enableTint) {
				const hueRotation = Math.random() * 360;
				const saturation = 80 + Math.random() * 40; // 80-120%
				const brightness = 90 + Math.random() * 20; // 90-110%
				particle.style.filter = `hue-rotate(${hueRotation}deg) saturate(${saturation}%) brightness(${brightness}%)`;
			}
			
			// Correctly calculate size using min and max bounds
			const size = particleSizeMin + Math.random() * (particleSizeMax - particleSizeMin);
			particle.style.fontSize = size + 'em';
			
			// Store initial offset across button width
			const buttonWidth = element.getBoundingClientRect().width * 1;
			const startOffsetX = (i / (particleCount - 1)) * buttonWidth - buttonWidth / 2;

            let rotationSpeed = 0;
            let initialRotation = 0;
			if (enableRotation) {
				rotationSpeed = (Math.random() - 0.5) * 360; // Random rotation speed in degrees per second
				initialRotation = Math.random() * 360; // Random initial rotation
            }
            particle.style.transform = `rotate(${initialRotation}deg)`;	
            particles.push({
                element: particle,
                x: startOffsetX,
                y: 0,
                vx: horizontalVelocity,
                vy: initialUpwardVelocity,
                life: 0,
                maxLife: particleLifetime,
                size: size,
                rotation: initialRotation,
                rotationSpeed: rotationSpeed
            });
			
			// Append particle to the DOM
			particleContainer.appendChild(particle);

			// Set initial position immediately to avoid (0,0) flash
			const rect = element.getBoundingClientRect();
			const centerX = rect.left + rect.width / 2;
			const centerY = rect.top + rect.height / 2;
			particle.style.left = (centerX + startOffsetX) + 'px';
			particle.style.top = centerY + 'px';
		}

		const frameInterval = 1000 / particleFPS;
		let lastTime = performance.now();
		let timeoutId: ReturnType<typeof setTimeout>;

		function animate() {
			const currentTime = performance.now();
			const deltaTime = currentTime - lastTime;
			lastTime = currentTime;
			const deltaSeconds = deltaTime / 1000;

			// Get current element position
			const rect = element.getBoundingClientRect();
			const centerX = rect.left + rect.width / 2;
			const centerY = rect.top + rect.height / 2;

			let aliveParticles = 0;

			// Ensure `scale` is calculated before use
			particles.forEach(p => {
				p.life += deltaTime;
				if (p.life >= p.maxLife) return;

				aliveParticles++;

				// Physics update (frame-rate independent)
				p.vy += gravity * deltaSeconds;
				p.x += p.vx * deltaSeconds;
				p.y += p.vy * deltaSeconds;

				// Calculate opacity with spherical dropoff using cosine
				const normalizedLife = p.life / p.maxLife;
				const opacity = Math.max(0, Math.cos(normalizedLife * Math.PI / 2));

				// Calculate scale (shrink slightly over time)
				const scale = Math.max(0.2, 1 - (p.life / p.maxLife) * 0.7);

				// Update rotation
				if (enableRotation) {
					p.rotation += p.rotationSpeed * deltaSeconds;
					p.element.style.transform = `scale(${scale}) rotate(${p.rotation}deg)`;
				} else {
					p.element.style.transform = `scale(${scale})`;
				}

				// Update DOM position relative to current element center
				p.element.style.left = (centerX + p.x) + 'px';
				p.element.style.top = (centerY + p.y) + 'px';
				p.element.style.opacity = opacity.toString();
			});

			// Check if the element still exists
			if (!element.isConnected) {
				// Stop the animation and clean up
				cleanupParticles();
				return;
			}

			if (aliveParticles > 0) {
				timeoutId = setTimeout(animate, frameInterval);
				activeAnimations.add(timeoutId);
			} else {
				cleanupParticles();
			}
		}

		// Refactor cleanup logic into a separate function
		function cleanupParticles() {
			particles.forEach(p => {
				if (p.element.parentNode) {
					p.element.parentNode.removeChild(p.element);
				}
			});
			activeAnimations.delete(timeoutId);
		}

		// Start animation
		timeoutId = setTimeout(animate, frameInterval);
		activeAnimations.add(timeoutId);
	}

	onDestroy(() => {
		// Clean up any active animations
		activeAnimations.forEach(timeoutId => {
			clearTimeout(timeoutId);
		});
		activeAnimations.clear();
	});
</script>

<div class="particle-container" bind:this={particleContainer}></div>

<style>
	.particle-container {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		pointer-events: none;
		z-index: 10;
	}

	:global(.particle-effect-point) {
		position: fixed;
		pointer-events: none;
		user-select: none;
		z-index: 999999;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 1;
	}
</style>
