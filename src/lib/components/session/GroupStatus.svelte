<script lang="ts">
	import { onMount } from 'svelte';
	import type { Timestamp } from 'firebase/firestore';

	let { group } = $props<{
		group: {
			id: string;
			status?: string;
			updatedAt?: Timestamp;
		};
	}>();

	let status = $state('');

	function getGroupStatus() {
		if (group.status === 'discussion') {
			if (group.updatedAt) {
				const diffInSeconds = Math.floor((Date.now() - group.updatedAt.toMillis()) / 1000);
				if (diffInSeconds > 20) {
					return `idle ${diffInSeconds} seconds`;
				}
			}
			return 'discussion';
		}
		return group.status || 'waiting';
	}

	onMount(() => {
		const statusInterval = setInterval(() => {
			status = getGroupStatus();
		}, 1000);

		return () => clearInterval(statusInterval);
	});
</script>

<span
	class="rounded-full px-2 py-0.5 text-xs {status?.startsWith('idle')
		? 'bg-red-100 text-red-600'
		: status === 'discussion'
			? 'bg-yellow-100 text-yellow-600'
			: status === 'summarize'
				? 'bg-blue-100 text-blue-600'
				: status === 'end'
					? 'bg-green-100 text-green-600'
					: 'bg-gray-100 text-gray-600'}"
>
	{status || getGroupStatus()}
</span>
