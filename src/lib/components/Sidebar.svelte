<script lang="ts">
	import { sidebarOpen } from '$lib/stores/sidebar';
	import Auth from '$lib/components/Auth.svelte';
	import { profile } from '$lib/stores/profile';
	import { LayoutDashboard, UserCog } from 'lucide-svelte';
</script>

<div class="sidebar" class:open={$sidebarOpen}>
	<nav>
		{#if $profile}
			<a href="/profile" class="inline-flex items-center">
				<UserCog size={30} class="inline-block text-blue-600" />
				<div class="inline-block w-auto text-lg">{$profile.displayName}</div>
			</a>
			<a class="inline-flex items-center" href="/dashboard">
				<LayoutDashboard size={30} class="inline-block w-auto text-blue-600" />
				<div class="inline-block w-auto text-lg">Dashboard</div>
			</a>
		{:else}
			<div class="">Please Sign in first.</div>
			<Auth />
		{/if}
	</nav>
</div>

<style>
	.sidebar {
		position: fixed;
		top: 0;
		left: 0;
		width: 10rem;
		height: 100%;
		background-color: #333;
		align-items: center;
		color: #fff;
		padding: 1rem;
		transform: translateX(-100%);
		transition: transform 0.3s ease;
		z-index: 10;
		padding-top: 4.5rem;
		font-size: 1.5rem;
	}

	.sidebar.open {
		transform: translateX(0);
	}

	.sidebar a {
		display: block;
		padding: 0.5rem 0;
		color: #ddd;
		text-decoration: none;
	}

	.sidebar a:hover {
		color: #fff;
	}
</style>
