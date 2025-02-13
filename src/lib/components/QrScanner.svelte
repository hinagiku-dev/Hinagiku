<script lang="ts">
	import { notifications } from '$lib/stores/notifications';
	import { Html5Qrcode } from 'html5-qrcode';
	import { onMount, onDestroy } from 'svelte';
	import { language } from '$lib/stores/language'; // Import the global language store

	let { onScan } = $props<{
		onScan: (code: string) => void;
	}>();

	let scanner: Html5Qrcode;
	let scanning = $state(false);
	let fileInput: HTMLInputElement;

	const translations = {
		en: {
			stopCamera: 'Stop Camera',
			startCamera: 'Start Camera',
			uploadQrImage: 'Upload QR Code Image',
			errorScanning: 'error during scanning: ',
			errorStartingCamera: 'error during starting camera: ',
			errorScanningFile: 'error during scanning file: ',
			unableToFindQr:
				'Unable to find QR code in the image. Please ensure the image is clear and contains a valid QR code.'
		},
		zh: {
			stopCamera: '停止相機',
			startCamera: '啟動相機',
			uploadQrImage: '上傳二維碼圖片',
			errorScanning: '掃描過程中出錯：',
			errorStartingCamera: '啟動相機過程中出錯：',
			errorScanningFile: '掃描文件過程中出錯：',
			unableToFindQr: '無法在圖像中找到二維碼。請確保圖像清晰並包含有效的二維碼。'
		}
	};

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
					// notifications.error(`${translations[$language].errorScanning} ${err}`);
				}
			);
		} catch (err) {
			notifications.error(`${translations[$language].errorStartingCamera} ${err}`);
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
				notifications.error(translations[$language].unableToFindQr);
			} else {
				notifications.error(`${translations[$language].errorScanningFile} ${err}`);
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
			{scanning ? translations[$language].stopCamera : translations[$language].startCamera}
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
				{translations[$language].uploadQrImage}
			</label>
		</div>
	</div>
</div>
