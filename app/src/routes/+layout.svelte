<script lang="ts">
	import Navigation from '$lib/components/Navigation.svelte';
</script>

<Navigation />

<main>
	<slot />
</main>

<style>
	main {
		min-height: calc(100vh - 80px);
	}
</style>
