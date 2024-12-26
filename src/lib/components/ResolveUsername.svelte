<script lang="ts">
	import { browser } from '$app/environment';
	import { getUser } from '$lib/utils/getUser';

	let { id }: { id: string } = $props();

	let promise = browser ? getUser(id) : Promise.resolve({ displayName: 'USER' });
	promise.then((user) => {
		console.log(user);
	});
</script>

{#await promise}<span class="animate-pulse">...</span>{:then user}{user.displayName}{:catch}<span
		class=" text-red-600">Error</span
	>{/await}
