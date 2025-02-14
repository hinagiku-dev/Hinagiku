<script lang="ts">
	import { language } from '$lib/stores/language'; // Import the global language store
	const translations = {
		en: {
			waitResponse: 'Please wait for other participants...'
		},
		zh: {
			waitResponse: '請等待其他參與者...'
		}
	};
</script>

<main class="mx-auto max-w-4xl px-4 py-8">{translations[$language].waitResponse}</main>
