import type { AnimationHandler } from './confetti';
import { createConfettiAnimation } from './confetti';
import { createLavaLampAnimation } from './lava_lamp';

export type { AnimationHandler };

export const animationRegistry: Record<string, (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => AnimationHandler> = {
  'birthday': createConfettiAnimation,
  'neon': createLavaLampAnimation,
};

export function createAnimation(
  themeName: string,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): AnimationHandler | null {
  const factory = animationRegistry[themeName];
  return factory ? factory(canvas, ctx) : null;
}
