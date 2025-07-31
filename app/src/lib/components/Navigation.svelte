<script lang="ts">
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import '$lib/themes.css';
	import Logo from './Logo.svelte';
    import { goto } from '$app/navigation';
</script>

<nav class="nav">
	<div class="nav-content">
		<a
			href="{resolve('/')}"
			class="logo"
			style="--color2: var(--text-color); --color1: var(--primary-color);"
		>
			<span class="logo-img"><Logo /></span>
			<span class="logo-text">Topic Tangle</span>
		</a>
	</div>
</nav>

<style>
	.nav {
		padding: 1rem 0;
		background: linear-gradient(to bottom, color-mix(in srgb, var(--background-color) 25%, transparent), transparent);
	}

	.nav-content {
		max-width: 800px;
		margin: 0 auto;
		padding: 0 2rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.logo {
		text-decoration: none;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1.5rem;
	}

	.logo-text {
		color: var(--text-color);
		font-weight: 700;
		transition: color 0.2s;
		text-shadow: 0 0 1em color-mix(in srgb, var(--secondary-color) 33%, transparent);
	}

	.logo-img {
		margin-top: 0.4em;
		transform-origin: 50% 40%;
	}

	.logo:hover {
		> .logo-img {
			animation: spin 0.5s linear infinite;
		}
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
