<script lang="ts">
	import { goto } from '$app/navigation';
	import { RoomAPI } from '$lib/api';
	import { getUserId } from '$lib/crypto';
	import { RangeSlider } from 'svelte-range-slider-pips';	

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
			const organizerId = await getUserId('user');
			const room = await RoomAPI.createRoom({
				organizerId,
				topics,
				minGroupSize,
				maxGroupSize,
				isActive: true
			});
			
			goto(`/tangle/${room.id}`);
		} catch (error) {
			console.error('Failed to create room:', error);
			alert('Failed to create tangle. Please try again.');
		} finally {
			isCreating = false;
		}
	}
</script>

<div class="container">
	<header>
		<h1>Topic Tangle</h1>
		<p>Create breakout groups based on shared interests</p>
	</header>

	<main>
		<div class="create-form">
			<h2>Create a New Tangle</h2>
			
			<div class="form-section">
				<h3>Discussion Topics</h3>
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
								>
									×
								</button>
							</div>
						{/each}
					</div>
				{/if}
				
				<p class="help-text">Add topics that participants can choose from (minimum 2)</p>
			</div>

			<div class="form-section">
				<h3>Group Size Settings</h3>
				<div class="group-size-slider">
					<label for="group-size-slider">Select group size range:</label>
					<div class="group-size-display">
						<span>Min: {minGroupSize}</span> - <span>Max: {maxGroupSize}</span>
					</div>
					<RangeSlider
						id="group-size-slider"
						bind:values={groupSizeRange}
						min={1}
						max={15}
						step={1}
						disabled={isCreating}
					/>
				</div>
				<p class="help-text">Set the target size range for breakout groups</p>
			</div>

			<button 
				type="button" 
				on:click={createRoom} 
				disabled={topics.length < 2 || isCreating}
				class="create-button"
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
	}

	header {
		text-align: center;
		margin-bottom: 3rem;
	}

	h1 {
		color: #2563eb;
		font-size: 2.5rem;
		margin-bottom: 0.5rem;
	}

	header p {
		color: #6b7280;
		font-size: 1.1rem;
	}

	.create-form {
		background: #ffffff;
		border: 1px solid #e5e7eb;
		border-radius: 0.75rem;
		padding: 2rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.form-section {
		margin-bottom: 2rem;
	}

	h2 {
		color: #1f2937;
		margin-bottom: 1.5rem;
	}

	h3 {
		color: #374151;
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
		background: #2563eb;
		color: white;
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		font-size: 1rem;
	}

	.topic-input button:hover:not(:disabled) {
		background: #1d4ed8;
	}

	.topic-input button:disabled {
		background: #9ca3af;
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
		background: #eff6ff;
		color: #1e40af;
		padding: 0.5rem 0.75rem;
		border-radius: 1rem;
		font-size: 0.9rem;
	}

	.topic-tag button {
		background: none;
		border: none;
		color: #1e40af;
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
		background: #dbeafe;
	}

	.group-size-slider {
		margin-bottom: 1rem;
	}

	.group-size-display {
		margin-bottom: 0.5rem;
		font-size: 1rem;
		font-weight: 500;
		color: #374151;
	}

	.help-text {
		color: #6b7280;
		font-size: 0.9rem;
		margin: 0;
	}

	.create-button {
		width: 100%;
		padding: 1rem;
		background: #059669;
		color: white;
		border: none;
		border-radius: 0.5rem;
		font-size: 1.1rem;
		font-weight: 600;
		cursor: pointer;
		margin-top: 1rem;
	}

	.create-button:hover:not(:disabled) {
		background: #047857;
	}

	.create-button:disabled {
		background: #9ca3af;
		cursor: not-allowed;
	}
</style>
