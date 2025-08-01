<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let qrCodeDataUrl: string;
	export let title: string = '';

	const dispatch = createEventDispatcher();

	function close() {
		dispatch('close');
	}
</script>

<div class="cover-screen" on:click={close}>
	<div class="content" on:click|stopPropagation>
		<button class="close-button" on:click={close}>&times;</button>
		<h1>{title}</h1>
		{#if qrCodeDataUrl}
			<div class="qr-code" style="background-image: url({qrCodeDataUrl});" title="QR Code for {title}"></div>
		{/if}
	</div>
</div>

<style>
	.cover-screen {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}

	.content {
		background: white;
		padding: 2rem;
		border-radius: 1rem;
		text-align: center;
		position: relative;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
		width: 80vw;
		height: 80vh;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
	}

	.close-button {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		background: none;
		border: none;
		font-size: 2rem;
		color: black;
		cursor: pointer;
	}

	h1 {
		margin: 0 0 1rem 0;
		color: black;
		flex-shrink: 0;
	}

	.qr-code {
		width: 100%;
		flex-grow: 1;
		background-size: contain;
		background-position: center;
		background-repeat: no-repeat;
		min-height: 0;
		image-rendering: pixelated;
	}
</style>
