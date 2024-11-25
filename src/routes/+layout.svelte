<script lang="ts">
	import '../app.css';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { sidebarOpen } from '$lib/stores/sidebar';
	import Navbar from '$lib/components/Navbar.svelte';
	import debug from 'debug';

	debug.enable('app:*');

	let { children } = $props();
</script>

<main class:sidebar-open={$sidebarOpen}>
	<Sidebar />
	<Navbar />
	{@render children()}
</main>

<style>
	main {
		margin-left: 0;
		transition: margin-left 0.3s ease;
	}

	main.sidebar-open {
		margin-left: 12.5rem; /* 側邊欄的寬度 */
	}
</style>
