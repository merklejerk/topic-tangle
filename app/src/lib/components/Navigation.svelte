<script lang="ts">
	import { page } from '$app/stores';
</script>

<nav class="nav">
	<div class="nav-content">
		<a href="/" class="logo">
			<span class="logo-text">Topic Tangle</span>
		</a>
		
		{#if $page.url.pathname !== '/'}
			<a href="/" class="nav-link">
				← Create New Tangle
			</a>
		{/if}
	</div>
</nav>

<style>
	.nav {
		background: white;
		border-bottom: 1px solid #e5e7eb;
		padding: 1rem 0;
		margin-bottom: 2rem;
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
		color: #2563eb;
		font-weight: 700;
		font-size: 1.5rem;
	}

	.logo:hover {
		text-decoration: none;
		color: #1d4ed8;
	}

	.nav-link {
		color: #6b7280;
		text-decoration: none;
		font-weight: 500;
		transition: color 0.2s;
	}

	.nav-link:hover {
		color: #2563eb;
		text-decoration: none;
	}
</style>
