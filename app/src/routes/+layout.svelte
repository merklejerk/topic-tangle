<script lang="ts">
	import Navigation from '$lib/components/Navigation.svelte';
	import BackgroundEffects from '$lib/components/BackgroundEffects.svelte';
</script>

<BackgroundEffects />
<Navigation />

<main>
	<slot />
</main>

<style>
	:global(body) {
		min-height: 100dvh;
	}
	main {
		padding: 1rem;
	}
</style>
