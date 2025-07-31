<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { slide, scale } from 'svelte/transition';
	import type { Topic } from '$lib/types';
    import { cubicIn, cubicOut } from 'svelte/easing';
	import ParticleEffect from './ParticleEffect.svelte';

	export let topics: Topic[];
	export let selectedTopics: string[];
	export let maxSelections: number;
	export let isSubmitting: boolean;
	export let particleFPS: number = 45; // Configurable framerate for particle animation

	// TODO: deprecated svelte fn.
	const dispatch = createEventDispatcher();

	let particleEffect: ParticleEffect;

	// Add audio element for sound effect
	let popSound: HTMLAudioElement;

	onMount(() => {
		popSound = new Audio(`${resolve('/')}/pop.ogg`);
	});

	function toggleTopicSelection(topicId: string) {
		const wasSelected = selectedTopics.includes(topicId);
		
		if (wasSelected) {
			// If already selected, deselect it
			selectedTopics = selectedTopics.filter((id) => id !== topicId);
		} else {
			// If not selected, add it.
			if (selectedTopics.length >= maxSelections) {
				// If max selections reached, swap with the oldest.
				selectedTopics = [...selectedTopics.slice(1), topicId];
			} else {
				// Otherwise, just add it.
				selectedTopics = [...selectedTopics, topicId];
			}
			
			// Play sound effect
			if (popSound) {
				popSound.currentTime = 0;
				popSound.volume = 0.66;
				popSound.play();
			}

			// Trigger particle effect when selecting (not deselecting)
			setTimeout(() => {
				const selectedButton = document.querySelector(`[data-topic-id="${topicId}"].selected`);
				if (selectedButton && particleEffect) {
					particleEffect.createParticleEffect(selectedButton as HTMLElement);
				}
			}, 100); // Small delay to let the transition start
		}
		dispatch('selectionChange', { selectedTopics });
	}</script><!-- Topic Selection -->
<div class="component">
	<!-- Particle effect component -->
	<div class="particle-effect-container">
		<ParticleEffect bind:this={particleEffect} {particleFPS} particleCharacter="👍" enableTint />
	</div>
	
	{#if selectedTopics.length > 0}
		<div class="selected-topics-container" transition:slide={{ duration: 300 }}>
			{#each selectedTopics.map(id => topics.find(t => t.id === id)) as topic (topic!.id)}
				<button
					class="topic-button selected"
					data-topic-id={topic!.id}
					on:click={() => toggleTopicSelection(topic!.id)}
					in:scale={{ duration: 300, start: 0, easing: cubicOut }}
					out:scale={{ duration: 175, start: 0, easing: cubicIn }}
				>
					{topic!.name}
				</button>
			{/each}
		</div>
	{/if}

	<div class="topics-cloud">
		{#each topics.filter((t) => !selectedTopics.includes(t.id)).sort((a, b) => a.name.localeCompare(b.name)) as topic (topic.id)}
			<button
				class="topic-button"
				on:click={() => toggleTopicSelection(topic.id)}
				in:scale={{ duration: 300, start: 0, easing: cubicOut }}
				out:scale={{ duration: 175, start: 0, easing: cubicIn }}
			>
				{topic.name}
			</button>
		{/each}
	</div>

	{#if isSubmitting}
		<div class="auto-save-status">
			<span class="saving spinner">↻</span>
		</div>
	{/if}
</div>

<style>
	.component {
		position: relative;
	}

	.selected-topics-container {
		padding: 0.5rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0.75em;
		align-items: center;
		justify-content: center;
		transition: all 0.3s ease;
	}

	.particle-effect-container {
		font-size: 1.5em;
	}

	.topics-cloud {
		display: flex;
		flex-wrap: wrap;
		gap: 1.33em;
		justify-content: center;
        margin-top: 1rem;
	}

	.topic-button {
		padding: 0.75em 1em;
		border-radius: 2rem;
		color: var(--text-color);
		cursor: pointer;
		transition: all 0.2s;
		font-size: 1.05em;
		user-select: none;
		background: transparent;
		border: 1px solid var(--primary-color);
	}

	.topic-button:hover:not(.disabled) {
		border-color: var(--primary-color);
		transform: scale(1.125);
		transform-origin: center;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		border: 1px solid transparent;
	}

	.topic-button.selected {
		background: var(--highlight-color);
		color: var(--highlight-text-color);
        font-size: 1.25em;
        font-weight: bold;
		border: 1px solid transparent;
	}

	.topic-button.selected:hover {
		transform: scale(0.925) translate(0, 0.1em);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
		opacity: 0.5;
		border: 1px solid transparent;
	}

	.auto-save-status {
		position: absolute;
		bottom: 0;
		right: 0;
		font-size: 0.9rem;
		color: var(--help-text-color);
	}

	.saving {
		color: var(--secondary-color);
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.spinner {
		display: inline-block;
		color: var(--help-text-color);
		animation: spin 0.5s linear infinite;
	}
</style>
