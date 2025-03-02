<script lang="ts">
	import { goto } from '$app/navigation';
	import QrScanner from '$lib/components/QrScanner.svelte';
	import { notifications } from '$lib/stores/notifications';
	import { getDoc, doc } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import * as m from '$lib/paraglide/messages.js';
	import { i18n } from '$lib/i18n';

	async function handleScan(code: string) {
		try {
			const url = new URL(code);
			if (url.pathname.startsWith('/session/')) {
				await goto(i18n.resolveRoute(url.pathname));
			} else {
				notifications.error('Invalid session QR code');
			}
		} catch (e) {
			notifications.error('Invalid QR code');
			console.error(e);
		}
	}

	let code = $state('');

	async function joinwithcode() {
		if (code.length != 6 || !/^\d{6}$/.test(code)) {
			notifications.error('Code must be 6 digits');
			return;
		}
		try {
			const codeDoc = await getDoc(doc(db, 'temp_codes', code));
			const sessionid = codeDoc.data()?.sessionId;
			if (!sessionid) {
				notifications.error('Invalid session code');
				return;
			}
			const url = new URL(`/session/${sessionid}`, window.location.href);
			await goto(i18n.resolveRoute(url.pathname));
		} catch (e) {
			notifications.error('Invalid session code');
			console.error(e);
		}
	}
</script>

<svelte:head>
	<title>Join Session | Hinagiku</title>
</svelte:head>

<main class="mx-auto max-w-2xl px-4 py-16">
	<h1 class="mb-8 text-3xl font-bold">{m.joinSession()}</h1>

	<div class="space-y-6">
		<p class="text-gray-600">
			{m.scanQr()}
		</p>

		<QrScanner onScan={handleScan} />
	</div>
	<!--Input Code-->
	<div class="mt-8 flex flex-col gap-4">
		<p class="text-gray-600">{m.enterCode()}</p>
		<input
			type="text"
			placeholder={m.enterCodePlaceholder()}
			maxlength="6"
			pattern="\d{6}"
			class="w-full rounded-lg border py-2"
			bind:value={code}
			required
		/>
		<button
			type="button"
			class="w-full rounded-lg border px-6 py-2 hover:bg-gray-50"
			onclick={joinwithcode}
		>
			{m.joinButton()}
		</button>
	</div>
</main>
