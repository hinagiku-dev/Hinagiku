<script lang="ts">
	import { Html5QrcodeScanner } from 'html5-qrcode';
	import { onMount, onDestroy } from 'svelte';

	let { onScan } = $props<{
		onScan: (code: string) => void;
	}>();

	let scanner: Html5QrcodeScanner;

	onMount(() => {
		scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 250 }, true);
		scanner.render(success, error);
	});

	onDestroy(() => {
		if (scanner) {
			scanner.clear();
		}
	});

	function success(decodedText: string) {
		onScan(decodedText);
	}

	function error(err: unknown) {
		console.error(err);
	}
</script>

<div id="qr-reader"></div>
