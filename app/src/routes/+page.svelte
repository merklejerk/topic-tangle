<script lang="ts">
	import { goto } from '$app/navigation';
	import { RoomAPI } from '$lib/api';
	import { getUserId } from '$lib/crypto';
	import { RangeSlider } from 'svelte-range-slider-pips';
	import { resolve } from '$app/paths';
	import ThemePicker from '$lib/components/ThemePicker.svelte';
	import '$lib/themes.css';
	import { currentTheme, themes, applyTheme } from '$lib/theme';
	import { onMount } from 'svelte';

	let topics: string[] = ['React', 'AI', 'Startups', 'Web Development', 'Data Science'];
	let currentTopic = '';
	let minGroupSize = 3;
	let maxGroupSize = 6;
	let isCreating = false;
	let groupSizeRange = [minGroupSize, maxGroupSize];
	let isDesktop = false;

	onMount(() => {
		// Set a random theme on mount.
		applyTheme(themes[Math.floor(Math.random() * themes.length)]);
		const mediaQuery = window.matchMedia('(min-width: 768px)');
		isDesktop = mediaQuery.matches;
		const update = (e: MediaQueryListEvent) => (isDesktop = e.matches);
		mediaQuery.addEventListener('change', update);
		return () => mediaQuery.removeEventListener('change', update);
	});

	$: minGroupSize = groupSizeRange[0];
	$: maxGroupSize = groupSizeRange[1];

	function addTopic() {
		const trimmedTopic = currentTopic.trim().substring(0, 50);
		const normalizedTopic = trimmedTopic.toLowerCase().replace(/[^a-z0-9]/g, '');
		if (
			trimmedTopic &&
			!topics.find(t => t.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedTopic)
		) {
			topics = [...topics, trimmedTopic];
			currentTopic = '';
		}
	}

	function removeTopic(topicId: string) {
		topics = topics.filter(t => t !== topicId);
	}

	function handleTopicKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			addTopic();
		}
	}

	async function createRoom() {
		isCreating = true;
		try {
			console.log($currentTheme.name);
			const organizerId = await getUserId('user');
			const room = await RoomAPI.createRoom({
				organizerId,
				topics,
				minGroupSize,
				maxGroupSize,
				isActive: true,
				style: $currentTheme.name,
			});

			goto(`${resolve('/tangle')}?id=${room.id}`);
		} catch (error) {
			console.error('Failed to create room:', error);
			alert('Failed to create tangle. Please try again.');
		} finally {
			isCreating = false;
		}
	}
</script>

<div class="container">
	<main>
		<div class="page-content">
			<div class="create-form panel">
				<h2>Create a New Tangle</h2>

				<div class="form-section">
					<h3>Discussion Topics</h3>
					<p class="help-text">Add topics that participants can choose from (minimum 2)</p>

					<div class="topic-input">
						<input
							type="text"
							bind:value={currentTopic}
							on:keydown={handleTopicKeydown}
							placeholder="Enter a topic (e.g., React, AI, Startups)"
							disabled={isCreating}
						/>
						<button type="button" on:click={addTopic} disabled={!currentTopic.trim() || isCreating}>
							Add Topic
						</button>
					</div>

					{#if topics.length > 0}
						<div class="topics-list">
							{#each topics as topic (topic)}
								<div class="topic-tag">
									<span>{topic}</span>
									<button
										type="button"
										on:click={() => removeTopic(topic)}
										disabled={isCreating}
										aria-label="Remove topic"
										class="btn-small"
									>
										×
									</button>
								</div>
							{/each}
						</div>
						<div class="clear-button-container">
							<button
								type="button"
								on:click={() => (topics = [])}
								disabled={isCreating}
								class="btn-secondary"
							>
								Clear All
							</button>
						</div>
					{/if}
				</div>

				<div class="form-section">
					<h3>Min/Max Group Size</h3>
					<div class="group-size-controls">
						<RangeSlider
							id="group-size-slider"
							bind:values={groupSizeRange}
							min={1}
							max={20}
							step={1}
							disabled={isCreating}
							float
							range
							style={Object.entries({
								'--range-slider': 'color-mix(in srgb, var(--secondary-color) 33%, transparent)',
								'--range-range-inactive':
									'color-mix(in srgb, var(--secondary-color) 33%, transparent)',
								'--range-range': 'color-mix(in srgb, var(--secondary-color) 33%, transparent)',
								'--range-handle': 'var(--secondary-color)',
								'--range-handle-focus': 'var(--secondary-color)',
								'--range-handle-inactive': 'var(--secondary-color)',
								'--range-handle-border': 'var(--border-color)',
								'--range-float-text': 'var(--button-text-color)'
							})
								.map(([k, v]) => `${k}: ${v}`)
								.join('; ')}
						/>
					</div>
				</div>

				<button
					type="button"
					on:click={createRoom}
					disabled={topics.length < 2 || isCreating}
					class="btn-primary"
				>
					{isCreating ? 'Creating Tangle...' : 'Create Tangle'}
				</button>
			</div>
			<div class="theme-picker-container">
				<ThemePicker direction={isDesktop ? 'column' : 'row'} />
			</div>
		</div>
	</main>
</div>

<style>
	.container {
		max-width: 800px;
		margin: 0 auto;
		font-family: system-ui, -apple-system, sans-serif;
		color: var(--text-color);
	}

	.page-content {
		display: flex;
		flex-direction: column;
	}

	.theme-picker-container {
		display: flex;
		justify-content: flex-end;
		font-size: 0.8rem;
		margin-top: -0.5rem;
	}

	@media (min-width: 768px) {
		.page-content {
			flex-direction: row;
			align-items: flex-start;
			gap: 1rem;
		}

		.create-form {
			flex: 1;
		}

		.theme-picker-container {
			font-size: 1rem;
		}
	}

	@media (max-width: 450px) {
		.topic-input {
			flex-direction: column;
			justify-content: center;
		}
	}

	.form-section {
		margin-bottom: 2rem;
	}

	h2 {
		color: var(--text-color);
		margin-bottom: 1.5rem;
	}

	h3 {
		color: var(--text-color);
		margin-bottom: 1rem;
		font-size: 1.1rem;
	}

	.topic-input {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.topic-input input {
		flex: 1;
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 0.5rem;
		font-size: 1rem;
	}

	.topic-input button {
		padding: 0.75rem 1rem;
		background: var(--primary-color);
		color: var(--button-text-color);
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		font-size: 1rem;
	}

	.topic-input button:hover:not(:disabled) {
		background: var(--secondary-color);
	}

	.topic-input button:disabled {
		background: var(--button-disabled-bg);
		color: var(--button-disabled-color);
		cursor: not-allowed;
	}

	.topics-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.topic-tag {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: var(--secondary-color);
		color: var(--button-text-color);
		padding: 0.5rem 0.75rem;
		border-radius: 1rem;
		font-size: 0.9rem;
	}

	.topic-tag button {
		background: none;
		border: none;
		color: var(--text-color);
		cursor: pointer;
		font-size: 1.2rem;
		line-height: 1;
		padding: 0;
		width: 1.2rem;
		height: 1.2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
	}

	.topic-tag button:hover:not(:disabled) {
		background: var(--primary-color);
	}

	.group-size-controls {
		margin: 3em 0 1rem 0;
	}

	:global(#group-size-slider .rangeFloat) {
		opacity: 1;
		translate: -50% 0;
	}

	.help-text {
		color: var(--help-text-color);
		font-size: 0.9rem;
	}

	.clear-button-container {
		text-align: right;
		margin-top: -0.5rem;
		margin-bottom: 0.5rem;
	}
</style>
