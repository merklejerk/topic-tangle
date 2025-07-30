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
	main {
		min-height: calc(100vh - 80px);
	}
</style>
