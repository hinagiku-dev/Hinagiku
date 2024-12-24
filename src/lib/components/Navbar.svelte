<script>
	import { Navbar, NavBrand, Avatar, Dropdown, DropdownItem } from 'flowbite-svelte';
	import { LogOut, User, LayoutDashboard } from 'lucide-svelte';
	import { signOut, user } from '$lib/stores/auth';
	import { profile } from '$lib/stores/profile';
	import { onMount } from 'svelte';

	let hinagiku = $state('Hinagiku');
	let highlight = $state(0);

	onMount(() => {
		const interval = setInterval(() => {
			let newHighlight;
			do {
				newHighlight = Math.floor(Math.random() * hinagiku.length);
			} while (newHighlight === highlight);
			highlight = newHighlight;
		}, 800);

		return () => clearInterval(interval);
	});
</script>

<Navbar class="fixed left-0 top-0 z-50 w-full shadow-sm">
	<NavBrand href="/">
		<img src="/Icon.png" class="mr-3 h-8" alt="Welcome to Hinagiku!" />
		<span class="self-center whitespace-nowrap text-2xl font-bold">
			{#each hinagiku as c, i}<span
					class="transition-colors duration-500"
					class:text-primary-600={i === highlight}>{c}</span
				>{/each}
		</span>
	</NavBrand>
	<div class="ml-auto flex items-center">
		{#if $user}
			<Avatar id="user-menu" src={$user.photoURL || ''} alt="User" class="cursor-pointer" />
			<Dropdown triggeredBy="#user-menu" class="w-48">
				<div class="px-4 py-3">
					<p class="text-sm text-gray-900">{$profile?.displayName}</p>
					<p class="truncate text-sm font-medium text-gray-500">{$user.email}</p>
				</div>
				<DropdownItem href="/profile" class="flex items-center"
					><User class="mr-2 h-4 w-4" />Profile</DropdownItem
				>
				<DropdownItem href="/dashboard" class="flex items-center"
					><LayoutDashboard class="mr-2 h-4 w-4" />Dashbaord</DropdownItem
				>
				<DropdownItem on:click={() => signOut()} class="flex items-center"
					><LogOut class="mr-2 h-4 w-4" />Sign out</DropdownItem
				>
			</Dropdown>
		{:else}
			<a
				href="/login"
				class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus:ring-4 focus:ring-primary-300"
			>
				Login
			</a>
		{/if}
	</div>
</Navbar>
