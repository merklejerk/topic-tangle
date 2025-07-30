<script lang="ts">
	import { goto } from '$app/navigation';
	import { RoomAPI } from '$lib/api';
	import { getUserId } from '$lib/crypto';
	import { RangeSlider } from 'svelte-range-slider-pips';	
	import { base } from '$app/paths';
	import ThemePicker from '$lib/components/ThemePicker.svelte';
	import '$lib/themes.css';
    import { currentTheme } from '$lib/theme';

	let topics: string[] = ['React', 'AI', 'Startups', 'Web Development', 'Data Science'];
	let currentTopic = '';
	let minGroupSize = 3;
	let maxGroupSize = 6;
	let isCreating = false;
	let groupSizeRange = [minGroupSize, maxGroupSize];

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
			
			goto(`${base}/tangle?id=${room.id}`);
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
		<ThemePicker />

		<div class="create-form">
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
						<button type="button" on:click={() => topics = []} disabled={isCreating} class="btn-secondary">
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
						max={15}
						step={1}
						disabled={isCreating}
						float
						range
						style={Object.entries({
							'--range-slider': 'color-mix(in srgb, var(--secondary-color) 33%, transparent)',
							'--range-range-inactive': 'color-mix(in srgb, var(--secondary-color) 33%, transparent)',
							'--range-range': 'color-mix(in srgb, var(--secondary-color) 33%, transparent)',
							'--range-handle': 'var(--secondary-color)',
							'--range-handle-focus': 'var(--secondary-color)',
							'--range-handle-inactive': 'var(--secondary-color)',
							'--range-handle-border': 'var(--border-color)',
							'--range-float-text': 'var(--button-text-color)',
						}).map(([k, v]) => `${k}: ${v}`).join('; ')}
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
	</main>
</div>

<style>
	.container {
		max-width: 600px;
		margin: 0 auto;
		padding: 2rem;
		font-family: system-ui, -apple-system, sans-serif;
		background-color: var(--background-color);
		color: var(--text-color);
	}

	.create-form {
		background: var(--background-color);
		border: 1px solid var(--border-color);
		border-radius: 0.75rem;
		padding: 2rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
