<script lang="ts">
	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';
	import QRCode from 'qrcode';
	import { RoomAPI } from '$lib/api';
	import { formatDateTime } from '$lib/utils';
	import { getUserId } from '$lib/crypto';
	import ParticipationStats from '$lib/components/ParticipationStats.svelte';
	import type { RoomConfig, UserSelection, RoomResults } from '$lib/types';

	let room: RoomConfig | null = null;
	let userSelections: UserSelection[] = [];
	let roomResults: RoomResults | null = null;
	let selectedTopics: string[] = [];
	let isLoading = true;
	let isSubmitting = false;
	let isTangling = false;
	let qrCodeDataUrl = '';
	let currentUrl = '';
	let cleanupPolling: (() => void) | null = null;
	let tangleId: string | null = null;


	let userId: string = '';
	const maxSelections = 3;

	onMount(async () => {
		currentUrl = window.location.href;
		tangleId = $page.url.searchParams.get('id');
		userId = await getUserId('user');
		await generateQRCode();
		await loadRoom();
		setupPolling();
	});

	onDestroy(() => {
		stopPolling();
	});

	function stopPolling() {
		if (cleanupPolling) {
			cleanupPolling();
			cleanupPolling = null;
		}
	}

	async function generateQRCode() {
		try {
			qrCodeDataUrl = await QRCode.toDataURL(currentUrl, {
				width: 384,
				margin: 2,
				color: {
					dark: '#000000',
					light: '#FFFFFF'
				}
			});
		} catch (error) {
			console.error('Failed to generate QR code:', error);
		}
	}

	async function loadRoom() {
		if (!tangleId) return;
		try {
			// Load room from API
			room = await RoomAPI.getRoom(tangleId);
			
			if (room) {
				// Load room data (selections and results)
				await loadRoomData();
			}
		} catch (error) {
			console.error('Failed to load room:', error);
		} finally {
			isLoading = false;
		}
	}

	async function loadRoomData() {
		if (!room) return;

		try {
			const { selections, results } = await RoomAPI.getRoomData(room.id);
			userSelections = selections;
			if (results) {
				roomResults = results;
			}

			const currentUserSelection = userSelections.find((s) => s.userId === userId);
			if (currentUserSelection) {
				selectedTopics = currentUserSelection.selectedTopics;
			}
		} catch (error) {
			console.error('Failed to load room data:', error);
		}
	}

	function setupPolling() {
		if (!room || roomResults) return;

		// Poll for room data (selections and results)
		cleanupPolling = RoomAPI.createPollingSubscription(
			() => RoomAPI.getRoomData(room!.id),
			({ selections, results }) => {
				userSelections = selections;
				if (results) {
					roomResults = results;
					return false; // Stop polling when results are available
				}
				const currentUserSelection = selections.find((s) => s.userId === userId);
				if (currentUserSelection) {
					selectedTopics = currentUserSelection.selectedTopics;
				} else {
					selectedTopics = [];
				}
				return true; // Continue polling otherwise
			}
		);
	}

	function toggleTopicSelection(topicId: string) {
		if (selectedTopics.includes(topicId)) {
			selectedTopics = selectedTopics.filter(id => id !== topicId);
		} else if (selectedTopics.length < maxSelections) {
			selectedTopics = [...selectedTopics, topicId];
		}
		
		// Auto-submit selection whenever it changes
		submitSelection();
	}

	async function submitSelection() {
		if (!room) return;

		isSubmitting = true;
		try {
			const selection: UserSelection = {
				userId,
				roomId: room.id,
				selectedTopics,
				updatedAt: new Date()
			};
			
			await RoomAPI.submitUserSelection(selection);
		} catch (error) {
			console.error('Failed to submit selection:', error);
			// Could show a toast notification here instead of alert
		} finally {
			isSubmitting = false;
		}
	}

	async function createBreakoutGroups() {
		if (!room) return;

		isTangling = true;
		try {
			roomResults = await RoomAPI.createBreakoutGroups(room.id, userId);
			if (roomResults) {
				stopPolling();
			}
		} catch (error) {
			console.error('Failed to create breakout groups:', error);
			alert('Failed to create breakout groups. Please try again.');
		} finally {
			isTangling = false;
		}
	}

	function copyLink() {
		navigator.clipboard.writeText(currentUrl);
		// Could add a toast notification here
	}

	function getTopicName(topicId: string): string {
		if (!room) return topicId;
		const topic = room.topics.find(t => t.id === topicId);
		return topic ? topic.name : topicId;
	}

	$: isUserOrganizer = room ? (userId === room.organizerId) : false;
	$: selectedTopicNames = room ? room.topics.filter(t => selectedTopics.includes(t.id)).map(t => t.name) : [];

	$: if (roomResults) {
		roomResults.groups.forEach(group => {
			group.icebreakerQuestions = group.icebreakerQuestions.map(question => 
				question.replace(/\[.*?\]\(.*?\)/g, '') // Remove markdown links
			);
		});
	}
</script>

<svelte:head>
	<title>Tangle {tangleId} - Topic Tangle</title>
</svelte:head>

<div class="container">
	{#if isLoading}
		<div class="loading">
			<h2>Loading tangle...</h2>
		</div>
	{:else if !room}
		<div class="error">
			<h2>Tangle not found</h2>
			<p>The tangle you're looking for doesn't exist or has expired.</p>
			<a href="/">Create a new tangle</a>
		</div>
	{:else}
		<header>
			<h1>Tangle: {room.id}</h1>
			<p>Created {formatDateTime(room.createdAt)}</p>
		</header>

		{#if isUserOrganizer}
			<!-- Organizer View -->
			<div class="organizer-section">
				<h2>Organizer Dashboard</h2>
				
				<div class="share-section">
					<h3>Share this Tangle</h3>
					<div class="share-content">
						<div class="qr-code">
							{#if qrCodeDataUrl}
								<img src={qrCodeDataUrl} alt="QR Code for tangle" />
							{/if}
						</div>
						<div class="link-section">
							<input type="text" value={currentUrl} readonly />
							<button on:click={copyLink}>Copy Link</button>
						</div>
					</div>
				</div>

				<div class="participants-section">
					{#if room}
						<ParticipationStats userSelections={userSelections} topics={room.topics} />
					{/if}
				</div>

				{#if !roomResults}
					<button 
						class="tangle-button" 
						on:click={createBreakoutGroups}
						disabled={isTangling || userSelections.length === 0}
					>
						{isTangling ? 'Creating Groups...' : 'Tangle!'}
					</button>
				{/if}
			</div>
		{:else}
			{#if roomResults}
				<div class="participants-section">
					{#if room}
						<ParticipationStats userSelections={userSelections} topics={room.topics} />
					{/if}
				</div>
			{/if}
		{/if}


		{#if !roomResults}
			<!-- Topic Selection -->
			<div class="selection-section">
				<h2>Choose Your Topics</h2>
				<p>Select up to {maxSelections} topics you're interested in discussing:</p>
				
				<div class="topics-cloud">
					{#each room.topics as topic (topic.id)}
						<button
							class="topic-button"
							class:selected={selectedTopics.includes(topic.id)}
							class:disabled={!selectedTopics.includes(topic.id) && selectedTopics.length >= maxSelections}
							on:click={() => toggleTopicSelection(topic.id)}
						>
							{topic.name}
						</button>
					{/each}
				</div>

				{#if selectedTopics.length > 0}
				<div class="auto-save-status">
					{#if isSubmitting}
						<span class="saving">💾</span>
					{:else}
						<span class="saved">✅</span>
					{/if}
				</div>
				{/if}
			</div>
		{:else}
			<!-- Results View -->
			<div class="results-section">
				<h2>Breakout Groups Created!</h2>
				<p>Groups were created on {formatDateTime(roomResults.createdAt)}</p>
				
				{#if roomResults.groups.length > 0}
					<div class="groups-list">
						{#each roomResults.groups as group, index (group.id)}
							<div class="group-card">
								<h3>Group {index + 1}</h3>
								<div class="group-topics">
									<strong>Topic:</strong> {getTopicName(group.assignedTopics[0])}
								</div>
								<div class="group-size">
									<strong>Members:</strong> {group.members.length}
								</div>
								{#if group.icebreakerQuestions.length > 0}
									<div class="icebreakers">
										<strong>Icebreaker Questions:</strong>
										<ul>
											{#each group.icebreakerQuestions as question}
												<li>{question}</li>
											{/each}
										</ul>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}

				{#if roomResults.unassignedUsers.length > 0}
					<div class="unassigned-notice">
						<p><strong>Note:</strong> {roomResults.unassignedUsers.length} participants couldn't be assigned to a group.</p>
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>

<style>
	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
		font-family: system-ui, -apple-system, sans-serif;
	}

	.loading, .error {
		text-align: center;
		padding: 3rem;
	}

	.error a {
		color: #2563eb;
		text-decoration: none;
	}

	.error a:hover {
		text-decoration: underline;
	}

	header {
		text-align: center;
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid #e5e7eb;
	}

	h1 {
		color: #2563eb;
		margin-bottom: 0.5rem;
	}

	.organizer-section {
		background: #fef3c7;
		border: 1px solid #f59e0b;
		border-radius: 0.75rem;
		padding: 1.5rem;
		margin-bottom: 2rem;
	}

	.share-section {
		margin-bottom: 1.5rem;
	}

	.share-content {
		display: flex;
		gap: 1.5rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.qr-code {
		width: 100%;
		text-align: center;
		margin-bottom: 1rem;
	}

	.qr-code img {
		width: 300px;
		margin: 0 auto;
		border-radius: 0.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.link-section {
		width: 100%;
		display: flex;
		justify-content: center;
		gap: 0.5rem;
	}

	.link-section input {
		flex: 1;
		max-width: 300px;
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 0.5rem;
		font-size: 0.9rem;
	}

	.link-section button {
		padding: 0.75rem 1rem;
		background: #2563eb;
		color: white;
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
	}

	.participants-section {
		margin-bottom: 1.5rem;
	}

	.tangle-button {
		width: 100%;
		padding: 1rem;
		background: #dc2626;
		color: white;
		border: none;
		border-radius: 0.5rem;
		font-size: 1.2rem;
		font-weight: 600;
		cursor: pointer;
	}

	.tangle-button:hover:not(:disabled) {
		background: #b91c1c;
	}

	.tangle-button:disabled {
		background: #9ca3af;
		cursor: not-allowed;
	}

	.selection-section {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 0.75rem;
		padding: 1.5rem;
		margin-bottom: 2rem;
	}

	.topics-cloud {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin: 1.5rem 0;
	}

	.topic-button {
		padding: 0.75rem 1rem;
		border: 2px solid #e5e7eb;
		border-radius: 2rem;
		background: white;
		cursor: pointer;
		transition: all 0.2s;
		font-size: 0.9rem;
	}

	.topic-button:hover:not(.disabled) {
		border-color: #2563eb;
		transform: translateY(-1px);
	}

	.topic-button.selected {
		background: #2563eb;
		color: white;
		border-color: #2563eb;
	}

	.topic-button.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.auto-save-status {
		margin-top: 0.75rem;
		font-size: 0.875rem;
		text-align: right;
	}

	.saving {
		color: #f59e0b;
	}

	.saved {
		color: #059669;
	}

	.results-section {
		background: #f0fdf4;
		border: 1px solid #22c55e;
		border-radius: 0.75rem;
		padding: 1.5rem;
	}

	.groups-list {
		display: grid;
		gap: 1rem;
		margin-top: 1.5rem;
	}

	.group-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		padding: 1rem;
	}

	.group-card h3 {
		margin-bottom: 0.75rem;
		color: #1f2937;
	}

	.group-topics, .group-size {
		margin-bottom: 0.5rem;
		font-size: 0.9rem;
	}

	.icebreakers {
		margin-top: 0.75rem;
		font-size: 0.9rem;
	}

	.icebreakers ul {
		margin: 0.5rem 0 0 1rem;
		padding: 0;
	}

	.icebreakers li {
		margin-bottom: 0.25rem;
	}

	.unassigned-notice {
		background: #fef3c7;
		border: 1px solid #f59e0b;
		border-radius: 0.5rem;
		padding: 1rem;
		margin-top: 1.5rem;
	}

	@media (max-width: 640px) {
		.share-content {
			flex-direction: column;
			align-items: stretch;
		}

		.topics-cloud {
			justify-content: center;
		}
	}
</style>
