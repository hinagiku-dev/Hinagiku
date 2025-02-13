<script lang="ts">
	import { Navbar, NavBrand, Avatar, Dropdown, DropdownItem, Button } from 'flowbite-svelte';
	import { LogOut, User, LayoutDashboard } from 'lucide-svelte';
	import { signOut, user } from '$lib/stores/auth';
	import { profile } from '$lib/stores/profile';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { language } from '$lib/stores/language'; // Import the global language store

	let hinagiku = $state('Hinagiku');
	let highlight = $state(0);

	const translations = {
		en: {
			welcome: 'Welcome to Hinagiku!',
			profile: 'Profile',
			dashboard: 'Dashboard',
			signOut: 'Sign out',
			login: 'Login'
		},
		zh: {
			welcome: '歡迎來到Hinagiku!',
			profile: '個人资料',
			dashboard: '儀表板',
			signOut: '登出',
			login: '登入'
		}
	};

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

	function toggleLanguage() {
		language.update((value) => (value === 'en' ? 'zh' : 'en'));
		console.log('Language:', $language);
	}
</script>

<Navbar class="fixed left-0 top-0 z-50 w-full shadow-sm">
	<NavBrand href="/">
		<img src="/Icon.png" class="mr-3 h-8" alt={translations[$language].welcome} />
		<span class="self-center whitespace-nowrap text-2xl font-bold">
			{#each hinagiku as c, i}<span
					class="transition-colors duration-500"
					class:text-primary-600={i === highlight}>{c}</span
				>{/each}
		</span>
	</NavBrand>
	<div class="ml-auto flex items-center">
		<Button on:click={toggleLanguage} class="mr-2">
			{$language === 'en' ? 'English' : '中文'}
		</Button>
		{#if $user}
			<Avatar id="user-menu" src={$user.photoURL || ''} alt="User" class="cursor-pointer" />
			<Dropdown triggeredBy="#user-menu" class="w-48">
				<div class="px-4 py-3">
					<p class="text-sm text-gray-900">{$profile?.displayName}</p>
					<p class="truncate text-sm font-medium text-gray-500">{$user.email}</p>
				</div>
				<DropdownItem href="/profile" class="flex items-center">
					<User class="mr-2 h-4 w-4" />{translations[$language].profile}
				</DropdownItem>
				<DropdownItem href="/dashboard" class="flex items-center">
					<LayoutDashboard class="mr-2 h-4 w-4" />{translations[$language].dashboard}
				</DropdownItem>
				<DropdownItem on:click={() => signOut()} class="flex items-center">
					<LogOut class="mr-2 h-4 w-4" />{translations[$language].signOut}
				</DropdownItem>
			</Dropdown>
		{:else if !page.url.pathname.startsWith('/login')}
			<Button href="/login" class="">{translations[$language].login}</Button>
		{/if}
	</div>
</Navbar>
