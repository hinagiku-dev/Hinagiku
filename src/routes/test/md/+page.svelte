<script lang="ts">
	import { renderMarkdown } from '$lib/utils/renderMarkdown';
	import { Textarea } from 'flowbite-svelte';

	let raw = $state('');
	let rendering = $state(false);
	let rendered = $state('');
	let debounceTimeout: ReturnType<typeof setTimeout> | undefined;

	const DEBOUNCE_DELAY_MS = 300;

	$effect(() => {
		// Clear existing timeout
		if (debounceTimeout) {
			clearTimeout(debounceTimeout);
		}

		// Don't render if input is empty
		if (!raw.trim()) {
			rendered = '';
			rendering = false;
			return;
		}

		debounceTimeout = setTimeout(() => {
			rendering = true;
			renderMarkdown(raw)
				.then((result) => {
					rendered = result;
				})
				.catch((error) => {
					console.error('Error rendering markdown:', error);
					rendered = 'Error rendering markdown';
				})
				.finally(() => {
					rendering = false;
				});
		}, DEBOUNCE_DELAY_MS);
	});
</script>

<div class="p-4">
	<h2 class="mb-4 text-2xl font-bold">Markdown Renderer</h2>
	<Textarea bind:value={raw} placeholder="Type your markdown here..." rows={10} class="mb-4" />

	{#if rendering}
		<p class="mt-2 text-gray-500">Rendering in progress...</p>
	{:else if rendered}
		<div class="mt-4 rounded bg-gray-100 p-4">
			<h3 class="mb-2 text-xl font-semibold">Rendered Output</h3>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html rendered}
		</div>

		<!-- show html code -->
		<div class="mt-4 rounded bg-gray-100 p-4">
			<h3 class="mb-2 text-xl font-semibold">HTML Output</h3>
			<pre class="whitespace-pre-wrap">{rendered}</pre>
		</div>
	{:else}
		<p class="mt-2 text-gray-500">No output yet. Type some markdown and wait for rendering.</p>
	{/if}
</div>
