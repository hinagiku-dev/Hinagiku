<script lang="ts">
	import { Navbar, NavBrand, Avatar, Dropdown, DropdownItem, Button } from 'flowbite-svelte';
	import { LogOut, User, Settings, LayoutDashboard, Globe } from 'lucide-svelte';
	import { signOut, user } from '$lib/stores/auth';
	import { profile } from '$lib/stores/profile';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import * as m from '$lib/paraglide/messages.js';
	import { deploymentConfig } from '$lib/config/deployment';
	import { languageTag } from '$lib/paraglide/runtime';
	import { i18n } from '$lib/i18n';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';

	let hinagiku = $state(deploymentConfig.siteTitle || 'Hinagiku');
	let highlight = $state(0);
	let hydrated = $state(false);

	// Define available languages for better type safety and scalability
	const availableLanguages = [
		{ code: 'en' as const, name: 'English' },
		{ code: 'zh' as const, name: '中文' }
		// Add more languages as needed in the future
	];

	// Function to switch language
	function switchLanguage(newLang: 'en' | 'zh') {
		if (!browser) return; // Only run in browser environment

		// Get the current URL path
		const pathname = window.location.pathname;

		// Extract current language from pathname
		const pathParts = pathname.split('/').filter(Boolean);
		const currentLang = pathParts[0] === 'en' || pathParts[0] === 'zh' ? pathParts[0] : 'en';

		// If new language is the same as current, do nothing
		if (newLang === currentLang) return;

		// Remove language prefix from pathname before resolving new route
		let cleanPath = pathname;
		if (currentLang === 'en' || currentLang === 'zh') {
			cleanPath = pathname.replace(/^\/(?:en|zh)(?=\/|$)/, '') || '/';
		}

		// Get new path using i18n.resolveRoute with cleaned path
		const newPath = i18n.resolveRoute(cleanPath, newLang);

		// Navigate to the new URL without a full page reload
		goto(newPath + window.location.search, {
			replaceState: true,
			noScroll: true
		});
	}

	onMount(() => {
		const interval = setInterval(() => {
			let newHighlight;
			do {
				newHighlight = Math.floor(Math.random() * hinagiku.length);
			} while (newHighlight === highlight);
			highlight = newHighlight;
		}, 800);
		hydrated = true;

		// Log the site title from deployment config
		console.log('Site title from deployment config:', deploymentConfig.siteTitle);

		return () => clearInterval(interval);
	});

	// Get the current path for login check using the page store
	let isLoginPage = $derived((browser && page?.url?.pathname?.startsWith('/login')) || false);

	// Handle login button click with redirect check
	function handleLoginClick() {
		if (!browser) return;

		// Check if current URL already contains a 'then' parameter with a session path
		const currentSearch = window.location.search;
		if (currentSearch.includes('then=') && currentSearch.includes('%2Fsession%2F')) {
			// Already on login page with redirect parameter, do nothing
			return;
		}

		// Otherwise navigate to login page
		goto(i18n.resolveRoute('/login'));
	}
</script>

<Navbar class="fixed left-0 top-0 z-50 w-full shadow-sm">
	<NavBrand href="/">
		<img src="/Icon.png" class="mr-3 h-8" alt={m.welcome()} />
		<span class="self-center whitespace-nowrap text-2xl font-bold">
			{#each hinagiku as c, i}<span
					class="transition-colors duration-500"
					class:text-primary-600={i === highlight}>{c}</span
				>{/each}
		</span>
	</NavBrand>
	<div class="ml-auto flex items-center">
		<!-- Language dropdown menu with text and icon -->
		<Button
			id="language-menu"
			class="mr-2 flex items-center gap-1 bg-transparent px-3 hover:bg-gray-100 dark:hover:bg-gray-700"
		>
			<Globe class="h-4 w-4 text-gray-500" />
			<span class="text-gray-500"
				>{hydrated ? (languageTag() === 'zh' ? '繁體中文' : 'English') : 'English'}</span
			>
			<span class="ml-1 text-xs text-gray-500">▼</span>
		</Button>
		<Dropdown triggeredBy="#language-menu" class="w-36">
			{#each availableLanguages as lang}
				<DropdownItem
					class="flex items-center {languageTag() === lang.code ? 'bg-gray-100' : ''}"
					on:click={() => switchLanguage(lang.code)}
				>
					<img
						src={`/icons/flag-${lang.code === 'en' ? 'us' : 'zh'}.${lang.code === 'en' ? 'png' : 'jpg'}`}
						alt={lang.name}
						class="mr-2 h-4 w-4"
					/>
					{lang.name}
				</DropdownItem>
			{/each}
		</Dropdown>
		{#if $user}
			<Avatar id="user-menu" src={$user.photoURL || ''} alt="User" class="cursor-pointer" />
			<Dropdown triggeredBy="#user-menu" class="w-48">
				<div class="px-4 py-3">
					<p class="text-sm text-gray-900">{$profile?.displayName}</p>
					<p class="truncate text-sm font-medium text-gray-500">{$user.email}</p>
				</div>
				<DropdownItem href="/profile" class="flex items-center">
					<User class="mr-2 h-4 w-4" />{m.profile()}
				</DropdownItem>
				<DropdownItem href="/setting" class="flex items-center">
					<Settings class="mr-2 h-4 w-4" />{m.settings()}
				</DropdownItem>
				<DropdownItem href="/dashboard" class="flex items-center">
					<LayoutDashboard class="mr-2 h-4 w-4" />{m.dashboard()}
				</DropdownItem>
				<DropdownItem on:click={() => signOut()} class="flex items-center">
					<LogOut class="mr-2 h-4 w-4" />{m.signOut()}
				</DropdownItem>
			</Dropdown>
		{:else if !isLoginPage}
			<Button on:click={handleLoginClick} class="">{m.login()}</Button>
		{/if}
	</div>
</Navbar>
