<script lang="ts">
	import { goto } from '$app/navigation';
	import QrScanner from '$lib/components/QrScanner.svelte';
	import { notifications } from '$lib/stores/notifications';
	import { getDoc, doc } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import { language } from '$lib/stores/language'; // Import the global language store

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
			await goto(url);
		} catch (e) {
			notifications.error('Invalid session code');
			console.error(e);
		}
	}

	const translations = {
		en: {
			joinSession: 'Join Discussion Session',
			scanQr: 'Scan the QR code provided by your session host to join the discussion.',
			enterCode: 'Or please enter the 6-digits code to join.',
			joinButton: 'Join Session',
			enterCodePlaceholder: 'Enter code'
		},
		zh: {
			joinSession: '加入討論會話',
			scanQr: '掃描會話主持人提供的二維碼以加入討論。',
			enterCode: '或者請輸入6位數的代碼以加入。',
			joinButton: '加入會話',
			enterCodePlaceholder: '輸入代碼'
		}
	};
</script>

<svelte:head>
	<title>Join Session | Hinagiku</title>
</svelte:head>

<main class="mx-auto max-w-2xl px-4 py-16">
	<h1 class="mb-8 text-3xl font-bold">{translations[$language].joinSession}</h1>

	<div class="space-y-6">
		<p class="text-gray-600">
			{translations[$language].scanQr}
		</p>

		<QrScanner onScan={handleScan} />
	</div>
	<!--Input Code-->
	<div class="mt-8 flex flex-col gap-4">
		<p class="text-gray-600">{translations[$language].enterCode}</p>
		<input
			type="text"
			placeholder={translations[$language].enterCodePlaceholder}
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
			{translations[$language].joinButton}
		</button>
	</div>
</main>
