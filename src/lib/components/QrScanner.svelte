<script lang="ts">
	import { notifications } from '$lib/stores/notifications';
	import { Html5Qrcode } from 'html5-qrcode';
	import { onMount, onDestroy } from 'svelte';
	import * as m from '$lib/paraglide/messages.js';

	let { onScan } = $props<{
		onScan: (code: string) => void;
	}>();

	let scanner: Html5Qrcode;
	let scanning = $state(false);
	let fileInput: HTMLInputElement;

	onMount(() => {
		scanner = new Html5Qrcode('qr-reader');
	});

	onDestroy(() => {
		if (scanner) {
			if (scanner.isScanning) {
				scanner.stop();
			}
			scanner.clear();
		}
	});

	async function startCamera() {
		try {
			scanning = true;
			await scanner.start(
				{ facingMode: 'environment' },
				{ fps: 10, qrbox: 250 },
				(decodedText) => {
					onScan(decodedText);
					scanner.stop();
					scanning = false;
				},
				(err) => {
					if ((err as unknown as Error).toString().includes('NotFoundException')) {
						return;
					}
					// notifications.error(`${m.errorScanning()} ${err}`);
				}
			);
		} catch (err) {
			notifications.error(`${m.errorStartingCamera()} ${err}`);
			scanning = false;
		}
	}

	async function handleFileInput(event: Event) {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (!file) return;

		try {
			const result = await scanner.scanFile(file, true);
			onScan(result);
		} catch (err) {
			if ((err as unknown as Error).toString().includes('NotFoundException')) {
				notifications.error(m.unableToFindQr());
			} else {
				notifications.error(`${m.errorScanningFile()} ${err}`);
			}
		} finally {
			fileInput.value = '';
		}
	}
</script>

<div class="space-y-4">
	<div id="qr-reader" class="mx-auto w-full max-w-sm"></div>

	<div class="flex flex-col gap-4">
		<button
			type="button"
			onclick={scanning ? () => scanner.stop() : startCamera}
			class="w-full rounded-lg border px-6 py-2 hover:bg-gray-50"
		>
			{scanning ? m.stopCamera() : m.startCamera()}
		</button>

		<div class="relative">
			<input
				type="file"
				accept="image/*"
				bind:this={fileInput}
				onchange={handleFileInput}
				class="hidden"
				id="qr-image-input"
			/>
			<label
				for="qr-image-input"
				class="block w-full cursor-pointer rounded-lg border px-6 py-2 text-center hover:bg-gray-50"
			>
				{m.uploadQrImage()}
			</label>
		</div>
	</div>
</div>
