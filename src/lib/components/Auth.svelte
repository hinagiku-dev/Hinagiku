<script lang="ts">
	import { signInWithGoogle, user } from '$lib/stores/auth';
	import { profile } from '$lib/stores/profile';
	import { Button } from 'flowbite-svelte';
	import { page } from '$app/stores';

	const then = $page.url.searchParams.get('then') || '/dashboard';
	const hasSessionParam = then.includes('session');
	const buttonText = hasSessionParam ? 'GoToNextPage' : 'Dashboard';

	// Parse session URLs robustly
	function getButtonHref(url: string): string {
		if (!url.includes('session')) {
			return '/dashboard';
		}

		try {
			// Use the URL API for robust URL parsing
			// If url is a relative path, prepend with origin to make it parseable
			const fullUrl = url.startsWith('/')
				? `${$page.url.origin}${url}`
				: url.includes('://')
					? url
					: `${$page.url.origin}/${url}`;

			const parsedUrl = new URL(fullUrl);

			// Extract just the pathname and search params for safe navigation
			return `${parsedUrl.pathname}${parsedUrl.search}`;
		} catch (error) {
			console.error('Error parsing session URL:', error);
			return '/dashboard';
		}
	}

	const buttonHref = getButtonHref(then);
</script>

{#if $user}
	<div class="flex items-center space-x-4">
		<p class="inline-block">Welcome, {$profile?.displayName || $user.displayName}!</p>
		<Button href={buttonHref} color="primary">{buttonText}</Button>
	</div>
{:else}
	<button
		class="inline-flex h-10 w-auto cursor-pointer items-center space-x-2"
		on:click={() => signInWithGoogle(then, $page.url.origin)}
	>
		<img class="max-h-8" src="/Google.png" alt="Sign in With Google" />
		<div class="w-auto text-lg">Sign in</div>
	</button>
{/if}

<style>
</style>
