<script lang="ts">
	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';
	import { flip } from 'svelte/animate';
	import { slide } from 'svelte/transition';
	import QRCode from 'qrcode';
	import { RoomAPI } from '$lib/api';
	import { formatDateTime } from '$lib/utils';
	import { getUserId } from '$lib/crypto';
	import { themes, applyTheme } from '$lib/theme';
	import ParticipationStats from '$lib/components/ParticipationStats.svelte';
	import TopicSelector from '$lib/components/TopicSelector.svelte';
	import type { RoomConfig, UserSelection, RoomResults } from '$lib/types';
	import '$lib/themes.css';

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
				console.log(room);
				// Apply theme if room has a style field that matches a known theme
				if (room.style && typeof room.style === 'string') {
					const matchingTheme = themes.find(theme => 
						theme.name.toLowerCase() === room!.style!.toLowerCase()
					);
					if (matchingTheme) {
						applyTheme(matchingTheme);
					}
				}
				
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
	}

	function handleSelectionChange(event: CustomEvent) {
		selectedTopics = event.detail.selectedTopics;
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
		<div class="topic-selection">
			<h2>Choose Your Topics</h2>
			<p>Select up to {maxSelections} topics you're interested in discussing:</p>
			<TopicSelector
				topics={room.topics}
				{selectedTopics}
				{maxSelections}
				{isSubmitting}
				on:selectionChange={handleSelectionChange}
			/>
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
		color: var(--text-color);
	}

	.loading, .error {
		text-align: center;
		padding: 3rem;
	}

	.error a {
		color: var(--primary-color);
		text-decoration: none;
	}

	.error a:hover {
		text-decoration: underline;
	}

	header {
		text-align: center;
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--border-color);
	}

	h1 {
		color: var(--primary-color);
		margin-bottom: 0.5rem;
	}

	.organizer-section {
		background: var(--card-background-color);
		border: 2px solid var(--secondary-color);
		border-radius: 0.75rem;
		padding: 1.5rem;
		margin-bottom: 2rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
		border: 2px solid var(--border-color);
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
		border: 2px solid var(--border-color);
		border-radius: 0.5rem;
		font-size: 0.9rem;
		background: var(--background-color);
		color: var(--text-color);
	}

	.link-section input:focus {
		outline: none;
		border-color: var(--primary-color);
	}

	.link-section button {
		padding: 0.75rem 1rem;
		background: var(--primary-color);
		color: var(--button-text-color);
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.link-section button:hover {
		background: var(--secondary-color);
	}

	.participants-section {
		margin-bottom: 1.5rem;
	}

	.tangle-button {
		width: 100%;
		padding: 1rem;
		background: var(--primary-color);
		color: var(--button-text-color);
		border: none;
		border-radius: 0.5rem;
		font-size: 1.2rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.tangle-button:hover:not(:disabled) {
		background: var(--secondary-color);
	}

	.tangle-button:disabled {
		background: var(--button-disabled-bg);
		color: var(--button-disabled-color);
		cursor: not-allowed;
	}

	.results-section {
		background: var(--background-color);
		border: 2px solid var(--primary-color);
		border-radius: 0.75rem;
		padding: 1.5rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.groups-list {
		display: grid;
		gap: 1rem;
		margin-top: 1.5rem;
	}

	.group-card {
		background: var(--background-color);
		border: 2px solid var(--border-color);
		border-radius: 0.5rem;
		padding: 1rem;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
	}

	.group-card h3 {
		margin-bottom: 0.75rem;
		color: var(--primary-color);
	}

	.group-topics, .group-size {
		margin-bottom: 0.5rem;
		font-size: 0.9rem;
		color: var(--text-color);
	}

	.icebreakers {
		margin-top: 0.75rem;
		font-size: 0.9rem;
		color: var(--text-color);
	}

	.icebreakers ul {
		margin: 0.5rem 0 0 1rem;
		padding: 0;
	}

	.icebreakers li {
		margin-bottom: 0.25rem;
	}

	.unassigned-notice {
		background: var(--card-background-color);
		border: 2px solid var(--secondary-color);
		border-radius: 0.5rem;
		padding: 1rem;
		margin-top: 1.5rem;
		color: var(--help-text-color);
	}

	.topic-selection {
		background: var(--card-background-color);
		border: 2px solid var(--border-color);
		border-radius: 0.75rem;
		padding: 1.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
