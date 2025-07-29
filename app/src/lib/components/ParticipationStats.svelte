<script lang="ts">
	import type { UserSelection, Topic } from '$lib/types';

	export let userSelections: UserSelection[];
	export let topics: Topic[];

	$: topicCounts = getTopicCounts(userSelections, topics);
	$: totalParticipants = userSelections.length;

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

<div class="stats-panel">
	<div class="summary">
		<div class="stat">
			<span class="stat-number">{totalParticipants}</span>
			<span class="stat-label">Participants</span>
		</div>
	</div>

	{#if topicCounts.length > 0}
		<div class="topic-stats">
			<h4>Topic Interest</h4>
			<div class="topic-list">
				{#each topicCounts as { topic, count } (topic.id)}
					<div class="topic-stat">
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
		</div>
	{/if}
</div>

<style>
	.stats-panel {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
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
		color: #2563eb;
		line-height: 1;
	}

	.stat-label {
		font-size: 0.875rem;
		color: #6b7280;
		margin-top: 0.25rem;
	}

	.topic-stats h4 {
		margin: 0 0 0.75rem 0;
		font-size: 1rem;
		color: #374151;
	}

	.topic-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.topic-stat {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.topic-name {
		font-size: 0.875rem;
		color: #374151;
		min-width: 100px;
		flex-shrink: 0;
	}

	.topic-bar {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		position: relative;
		background: #e5e7eb;
		border-radius: 0.25rem;
		height: 1.25rem;
		overflow: hidden;
	}

	.topic-bar-fill {
		height: 100%;
		background: #3b82f6;
		transition: width 0.3s ease;
	}

	.topic-count {
		position: absolute;
		right: 0.5rem;
		font-size: 0.75rem;
		color: #374151;
		font-weight: 600;
		z-index: 1;
	}
</style>
