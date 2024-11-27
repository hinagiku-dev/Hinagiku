<script lang="ts">
	import { goto } from '$app/navigation';
	import QrScanner from '$lib/components/QrScanner.svelte';
	import { notifications } from '$lib/stores/notifications';

	async function handleScan(code: string) {
		try {
			const url = new URL(code);
			if (url.pathname.startsWith('/session/')) {
				await goto(url);
			} else {
				notifications.error('Invalid session QR code');
			}
		} catch (e) {
			notifications.error('Invalid QR code');
			console.error(e);
		}
	}
</script>

<svelte:head>
	<title>Join Session | Hinagiku</title>
</svelte:head>

<main class="mx-auto max-w-2xl px-4 py-16">
	<h1 class="mb-8 text-3xl font-bold">Join Discussion Session</h1>

	<div class="space-y-6">
		<p class="text-gray-600">
			Scan the QR code provided by your session host to join the discussion.
		</p>

		<QrScanner onScan={handleScan} />
	</div>
</main>
