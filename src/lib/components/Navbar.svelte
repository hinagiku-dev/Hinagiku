<script lang="ts">
	import { Navbar, NavBrand, Avatar, Dropdown, DropdownItem, Button } from 'flowbite-svelte';
	import { LogOut, User, LayoutDashboard } from 'lucide-svelte';
	import { signOut, user } from '$lib/stores/auth';
	import { profile } from '$lib/stores/profile';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { language } from '$lib/stores/language'; // Import the global language store
	import { browser } from '$app/environment';

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
			welcome: '歡迎來到 Hinagiku!',
			profile: '個人資料',
			dashboard: '儀表板',
			signOut: '登出',
			login: '登入'
		}
	};

	import { derived } from 'svelte/store';

	const flagSrc = derived(language, ($language) => {
		return browser
			? $language === 'zh'
				? '/icons/flag-zh.jpg'
				: '/icons/flag-us.png'
			: '/icons/flag-us.png';
	});

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

	function setLanguage(lang: 'en' | 'zh') {
		language.set(lang);
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

		<!-- Remove the old toggle button and add a dropdown for language selection(PM requested) -->
		<Avatar id="language-menu" src={$flagSrc} alt="$language" class="ml-2 cursor-pointer" />
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
	</div>
</Navbar>
