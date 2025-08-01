<script lang="ts">
	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';
	import QRCode from 'qrcode';
	import { RoomAPI } from '$lib/api';
	import { formatDateTime } from '$lib/utils';
	import { getUserId } from '$lib/crypto';
	import { themes, applyTheme } from '$lib/theme';
	import ParticipationStats from '$lib/components/ParticipationStats.svelte';
	import TopicSelector from '$lib/components/TopicSelector.svelte';
	import CoverScreen from '$lib/components/CoverScreen.svelte';
	import type { RoomConfig, UserSelection, RoomResults, BreakoutGroup } from '$lib/types';
	import '$lib/themes.css';
	import ShareIcon from '$lib/components/ShareIcon.svelte';
	import { debounce } from 'underscore';

	let room: RoomConfig | null = null;
	let userSelections: UserSelection[] = [];
	let roomResults: RoomResults | null = null;
	let selectedTopics: string[] = [];
	let isLoading = true;
	let isSubmitting = false;
	let isTangling = false;
	let showQrCode = false;
	let qrCodeDataUrl = '';
	let currentUrl = '';
	let cleanupPolling: (() => void) | null = null;
	let tangleId: string | null = null;


	let userId: string = '';
	const maxSelections = 3;

	const debouncedSubmit = debounce(() => {
		submitSelection();
	}, 1000);

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
		// cancel any pending debounced call
		if (debouncedSubmit.cancel) debouncedSubmit.cancel();
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
				// Filter out the current user's selection from the polled data
				// to prevent overwriting local changes that haven't been processed by the server yet.
				const otherUserSelections = selections.filter(s => s.userId !== userId);
				const currentUserSelection = userSelections.find(s => s.userId === userId);
				
				if (currentUserSelection) {
					userSelections = [...otherUserSelections, currentUserSelection];
				} else {
					userSelections = otherUserSelections;
				}

				if (results) {
					roomResults = results;
					return false; // Stop polling when results are available
				}
				
				return true; // Continue polling otherwise
			}
		);
	}

	function handleSelectionChange(event: CustomEvent) {
		selectedTopics = event.detail.selectedTopics;

		// Update userSelections array to reflect the change immediately for the UI
		const currentUserSelectionIndex = userSelections.findIndex(s => s.userId === userId);
		if (currentUserSelectionIndex !== -1) {
			userSelections[currentUserSelectionIndex] = {
				...userSelections[currentUserSelectionIndex],
				selectedTopics: selectedTopics
			};
			userSelections = [...userSelections]; // Trigger reactivity
		} else {
			// If user had no previous selections, add a new one
			userSelections = [...userSelections, {
				userId,
				roomId: room!.id,
				selectedTopics,
				updatedAt: new Date()
			}];
		}

		// Debounced submit to avoid excessive API calls
		debouncedSubmit();
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
			// Remove markdown links and any empty parentheses they leave behind.
			group.icebreakerQuestions = group.icebreakerQuestions.map(question => 
				question.replace(/\[.*?\]\(.*?\)/g, '').replace(/\(\)/g, '').trim()
			);
		});
	}

	// Find the user's group and sort groups to put user's group first
	$: sortedGroups = roomResults ? (() => {
		const userGroup = roomResults.groups.find(group => group.members.includes(userId));
		const otherGroups = roomResults.groups.filter(group => !group.members.includes(userId));
		return userGroup ? [userGroup, ...otherGroups] : roomResults.groups;
	})() : [];

	// Check if a group contains the current user
	function isUserInGroup(group: BreakoutGroup): boolean {
		return group.members.includes(userId);
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
			<div class="header-content">
				<h1>Tangle {room.id}</h1>
				<button class="btn-icon" on:click={() => showQrCode = true}><ShareIcon /></button>
			</div>
			<p>Created {formatDateTime(room.createdAt)}</p>
		</header>

		{#if isUserOrganizer}
			<!-- Organizer View -->
				<div class="organizer-section panel">
				<div class="share-section">
					<div class="share-content">
						<div class="qr-code">
							{#if qrCodeDataUrl}
								<button class="qr-code-button" style={`background-image: url(${qrCodeDataUrl}) `} on:click={() => showQrCode = true} />
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
			<div class="user-section panel">
					<div class="participants-section">
						{#if room}
							<ParticipationStats userSelections={userSelections} topics={room.topics} />
						{/if}
					</div>
				</div>
			{/if}
		{/if}


		{#if !roomResults}
		<div class="topic-selection">
			<h2>Choose Your Topics</h2>
			<p>Pick up to {maxSelections} topics you want to discuss. You can change them any time.</p>
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
		<div class="results-section panel">
				<h2>Breakout Groups Created!</h2>
				
				{#if roomResults.groups.length > 0}
					<div class="groups-list">
						{#each sortedGroups as group (group.id)}
							<div class="group-card" class:user-group={isUserInGroup(group)}>
								<h3>{getTopicName(group.assignedTopics[0])}</h3>
								{#if isUserInGroup(group)}
									<div class="user-badge">Your Group</div>
								{/if}
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

{#if showQrCode}
	<CoverScreen qrCodeDataUrl={qrCodeDataUrl} title={`Tangle ${room!.id}`} on:close={() => showQrCode = false} />
{/if}

<style>
	.container {
		max-width: 800px;
		margin: 0 auto;
		color: var(--text-color);
	}

	.header-content {
		display: flex;
		gap: 1rex;

		> h1 {
			display: inline;
			min-width: max-content;
		}
		> button {
			padding: 0;	
		}
		align-items: center;
		justify-content: center;
		margin-bottom: 1rem;
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
		margin: 0 0 1.5rem 0;
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
	}

	.qr-code-button {
		height: 300px;	
		width: 300px;
		image-rendering: pixelated;
		margin: 0 auto;
		border-radius: 0.5rem;
		background-size: cover;
		background-position: center;
		border: none;
		cursor: zoom-in;
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

	.groups-list {
		display: grid;
		gap: 1rem;
		margin-top: 1.5rem;
	}

	.group-card {
		border: 2px solid var(--border-color);
		border-radius: 0.5rem;
		padding: 1rem;
		position: relative;
	}

	.group-card.user-group {
		border-color: var(--border-color);
		border-width: 3px;
	}

	.user-badge {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		background: var(--highlight-color);
		color: var(--highlight-text-color);
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.025em;
		box-shadow: 1px 1px 4px rgba(0, 0, 0, 0.5);
		animation: rock 1.5s ease-out infinite;
		transform-origin: bottom center;
	}

	.group-card h3 {
		margin-bottom: 0.75rem;
		color: var(--primary-color);
	}

	.group-size {
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
		border-radius: 0.75rem;
		padding: 1.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	@keyframes rock {
		0%,
		100% {
			transform: rotate(0deg);
		}
		25% {
			transform: rotate(-8deg);
		}
		75% {
			transform: rotate(8deg);
		}
	}

	@media (max-width: 640px) {
		.share-content {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
