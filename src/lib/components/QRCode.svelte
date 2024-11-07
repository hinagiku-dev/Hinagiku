<script lang="ts">
	import QRCode from 'qrcode';
	import { onMount } from 'svelte';

	let { value } = $props<{ value: string }>();
	let canvas: HTMLCanvasElement;

	onMount(() => {
		QRCode.toCanvas(canvas, value, { width: 200 });
	});
</script>

<canvas bind:this={canvas}></canvas>
