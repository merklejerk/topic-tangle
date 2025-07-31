<script lang="ts">
	import { flip } from 'svelte/animate';
	import type { UserSelection, Topic } from '$lib/types';
	import '$lib/themes.css';
	import ParticleEffect from './ParticleEffect.svelte';

	export let userSelections: UserSelection[];
	export let topics: Topic[];

	$: topicCounts = getTopicCounts(userSelections, topics);
	$: totalParticipants = userSelections.length;

	let isTopicStatsVisible = true;
	let particleEffect: ParticleEffect;
	let topOfChartAnchor: HTMLElement;

	let previousTotalParticipants = 0;
	let previousTopTopicId: string | undefined = undefined;

	$: {
		const newTopTopic = topicCounts[0];
		const newTopTopicId = newTopTopic?.topic.id;

		let shouldTriggerEffect = false;

		// Trigger 1: First vote ever
		if (previousTotalParticipants === 0 && totalParticipants > 0) {
			shouldTriggerEffect = true;
		}

		// Trigger 2: Top topic changes (but not on the very first vote)
		if (
			previousTotalParticipants > 0 &&
			previousTopTopicId &&
			newTopTopicId &&
			newTopTopicId !== previousTopTopicId &&
			totalParticipants > 0
		) {
			shouldTriggerEffect = true;
		}

		if (shouldTriggerEffect && particleEffect && topOfChartAnchor) {
			// Use a timeout to allow the flip animation to happen.
			// This feels more natural even though we aren't targeting the flipping element.
			setTimeout(() => {
				particleEffect.createParticleEffect(topOfChartAnchor);
			}, 300);
		}

		previousTotalParticipants = totalParticipants;
		previousTopTopicId = newTopTopicId;
	}

	function toggleTopicStats() {
		isTopicStatsVisible = !isTopicStatsVisible;
	}

	function getTopicCounts(selections: UserSelection[], allTopics: Topic[]) {
		const counts = new Map<string, { topic: Topic; count: number }>();

		// Initialize counts
		allTopics.forEach(topic => {
			counts.set(topic.id, { topic, count: 0 });
		});

		// Count selections
		selections.forEach(selection => {
			selection.selectedTopics.forEach(topicId => {
				const entry = counts.get(topicId);
				if (entry) {
					entry.count++;
				}
			});
		});

		return Array.from(counts.values()).sort((a, b) => b.count - a.count);
	}
</script>

<div class="particle-effect-container">
	<ParticleEffect
		bind:this={particleEffect}
		particleCharacter="🏆"
		particleCount={24}
		enableRotation
		upwardVelocityMin={100}
		particleLifetime={2000}
		horizontalSpread={200}
	/>
</div>

<div class="stats-panel">
	<div class="summary">
		<div class="stat">
			<span class="stat-number">{totalParticipants}</span>
			<span class="stat-label">Participants</span>
		</div>
	</div>

	{#if topicCounts.length > 0}
		<div class="topic-stats">
			<h4 class="topic-header">
				Topic Interest
				<button on:click={toggleTopicStats} class="toggle-button" aria-label="Toggle Topic Interest">
					<svg
						class="toggle-icon"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="{isTopicStatsVisible ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'}"
						/>
					</svg>
				</button>
			</h4>
			<div
				class="topic-list-wrapper"
				style="height: {isTopicStatsVisible ? 'auto' : '0'}; overflow: hidden; transition: height 0.3s ease;"
			>
				{#if isTopicStatsVisible}
					<div class="topic-list">
						<!-- Invisible anchor for particle effect -->
						<div
							bind:this={topOfChartAnchor}
							style="position: absolute; top: 0.5rem; left: 0; width: 100%; height: 1px; z-index: -1;"
						></div>
						{#each topicCounts as { topic, count }, i (topic.id)}
							<div class="topic-stat" animate:flip={{ duration: 300 }} data-topic-id={topic.id}>
								<span class="topic-name">{topic.name}</span>
								<div class="topic-bar">
									<div
										class="topic-bar-fill"
										style="width: {totalParticipants > 0 ? (count / totalParticipants) * 100 : 0}%"
									></div>
									<span class="topic-count">{count}</span>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.particle-effect-container {
		font-size: 1.5rem;
	}

	.stats-panel {
		border: 1px solid var(--border-color);
		border-radius: 0.5rem;
		padding: 1rem;
		margin-top: 1rem;
	}

	.summary {
		margin-bottom: 1.5rem;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	.stat-number {
		font-size: 2rem;
		font-weight: 700;
		line-height: 1;
	}

	.stat-label {
		font-size: 0.875rem;
		color: var(--help-text-color);
		margin-top: 0.25rem;
	}

	.topic-stats {
		margin-top: 1rem;
	}

	.topic-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 1rem;
		color: var(--help-text-color);
		margin: 0 0 0.75rem 0;
	}

	.toggle-button {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--help-text-color);
	}

	.toggle-button:hover {
		transform: scale(1.2);
		background: none;
	}

	.toggle-icon {
		width: 1.5rem;
		height: 1.5rem;
	}

	.topic-list-wrapper {
		transition: height 0.3s ease;
		overflow: hidden;
	}

	.topic-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		position: relative;
	}

	.topic-stat {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.topic-name {
		font-size: 0.875rem;
		color: var(--text-color);
		min-width: 100px;
		flex-shrink: 0;
	}

	.topic-bar {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		position: relative;
		background: var(--border-color);
		border-radius: 0.25rem;
		height: 1.25rem;
		overflow: hidden;
	}

	.topic-bar-fill {
		height: 100%;
		background: var(--secondary-color);
		transition: width 0.3s ease;
	}

	.topic-count {
		position: absolute;
		right: 0.5rem;
		font-size: 0.75rem;
		color: var(--text-color);
		font-weight: 600;
		z-index: 1;
	}
</style>
