<script lang="ts">
  import { onDestroy } from 'svelte';
  import { currentTheme } from '$lib/theme';
  import { createAnimation, type AnimationHandler } from '$lib/animations';

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let currentAnimation: AnimationHandler | null = null;
  let currentThemeName: string = '';

  function resizeCanvas() {
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  }

  function initializeAnimation() {
    // Clean up existing animation
    if (currentAnimation) {
      currentAnimation.cleanup();
      currentAnimation = null;
    }

    if (canvas && $currentTheme.name) {
      ctx = canvas.getContext('2d')!;
      resizeCanvas();
      
      currentAnimation = createAnimation($currentTheme.name, canvas, ctx);
      if (currentAnimation) {
        currentAnimation.init();
        currentAnimation.animate();
      }
    }
  }

  $: {
    // Only restart animation if theme actually changed and we have a canvas
    if ($currentTheme.name !== currentThemeName) {
      currentThemeName = $currentTheme.name;
      if (canvas) {
        initializeAnimation();
      }
    }
  }

  // Watch for canvas changes and initialize animation if needed
  $: if (canvas && currentThemeName === $currentTheme.name) {
    initializeAnimation();
  }

  onDestroy(() => {
    if (currentAnimation) {
      currentAnimation.cleanup();
    }
  });
</script>

<svelte:window on:resize={resizeCanvas} />

<canvas bind:this={canvas} style="position: fixed; top: 0; left: 0; z-index: -1; pointer-events: none;"></canvas>
