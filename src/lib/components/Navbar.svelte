<script lang="ts">
	import { Navbar, NavBrand, Avatar, Dropdown, DropdownItem, Button } from 'flowbite-svelte';
	import { LogOut, User, Settings, LayoutDashboard, Globe } from 'lucide-svelte';
	import { signOut, user } from '$lib/stores/auth';
	import { profile } from '$lib/stores/profile';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { language } from '$lib/stores/language'; // Import the global language store
	import * as m from '$lib/paraglide/messages.js';
	import { deploymentConfig } from '$lib/config/deployment';

	let hinagiku = $state(deploymentConfig.siteTitle || 'Hinagiku');
	let highlight = $state(0);
	let hydrated = $state(false);

	import { derived } from 'svelte/store';

	const currentLanguageText = derived(language, ($language) => {
		return $language === 'zh' ? '繁體中文' : 'English';
	});

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

	function setLanguage(lang: 'en' | 'zh') {
		language.set(lang);
		console.log('set language to', lang);
		//console.log('current pathname:', window.location.pathname);
		if (lang === 'en' && window.location.pathname.startsWith('/zh')) {
			console.log('gotoen', window.location.pathname.replace('/zh', ''));
			if (window.location.pathname === '/zh') {
				window.location.assign(
					window.location.pathname.replace('/zh', '/') + window.location.search
				);
			} else {
				window.location.assign(
					window.location.pathname.replace('/zh', '') + window.location.search
				);
			}
		} else if (lang === 'zh' && !window.location.pathname.startsWith('/zh')) {
			console.log('gotozh', window.location.pathname);
			window.location.assign('/zh' + window.location.pathname + window.location.search);
		}
		//window.location.reload();
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
			<span class="text-gray-500">{hydrated ? $currentLanguageText : 'English'}</span>
			<span class="ml-1 text-xs text-gray-500">▼</span>
		</Button>
		<Dropdown triggeredBy="#language-menu" class="w-36">
			<DropdownItem class="flex items-center" on:click={() => setLanguage('en')}>
				<img src="/icons/flag-us.png" alt="English" class="mr-2 h-4 w-4" />
				English
			</DropdownItem>
			<DropdownItem class="flex items-center" on:click={() => setLanguage('zh')}>
				<img src="/icons/flag-zh.jpg" alt="中文" class="mr-2 h-4 w-4" />
				繁體中文
			</DropdownItem>
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
		{:else if !page.url.pathname.startsWith('/login')}
			<Button href="/login" class="">{m.login()}</Button>
		{/if}
	</div>
</Navbar>
