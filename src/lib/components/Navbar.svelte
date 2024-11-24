<script>
	import { sidebarOpen } from '$lib/stores/sidebar';
	import Auth from '$lib/components/Auth.svelte';
</script>

<nav>
	<button
		class="menu-toggle"
		on:click={() => sidebarOpen.update((n) => !n)}
		aria-label="Toggle menu"
	>
		&#9776;
	</button>
	<a href="/" class="flex h-full w-auto cursor-pointer items-center space-x-4 no-underline">
		<img
			class="h-full w-auto cursor-pointer items-center"
			src="/Icon.png"
			alt="Welcome to Hinagiku!"
		/>
		<span class="inline-block text-2xl font-bold text-white">Hinagiku</span>
	</a>
	<div class="menu right">
		<Auth />
	</div>
</nav>

<style>
	nav {
		display: flex;
		justify-content: left;
		gap: 1rem;
		align-items: center;
		padding: 1rem;
		background-color: #333;
		color: white;
		z-index: 1000;
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 2.5rem;
	}

	.menu {
		display: flex;
		gap: 1rem;
	}

	.menu.right {
		margin-left: auto;
		padding-right: 2rem;
	}

	.menu-toggle {
		z-index: 1000;
		display: flex;
		cursor: pointer;
		font-size: 1rem;
	}
</style>
