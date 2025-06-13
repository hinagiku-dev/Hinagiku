<script lang="ts">
	import { onMount } from 'svelte';
	import type { Timestamp } from 'firebase/firestore';
	import * as m from '$lib/paraglide/messages.js';

	let { group, showStatus = false } = $props<{
		group: {
			id: string;
			status?: string;
			updatedAt?: Timestamp;
		};
		showStatus?: boolean;
	}>();

	let status = $state('');

	function getGroupStatus() {
		if (group.status === 'discussion') {
			if (group.updatedAt) {
				const diffInSeconds = Math.floor((Date.now() - group.updatedAt.toMillis()) / 1000);
				if (diffInSeconds > 60) {
					//update idle status to 60 seconds to fix client's demand
					return m.statusIdle({ seconds: diffInSeconds });
				}
			}
			return m.statusDiscussion();
		}
		return group.status === 'summarize'
			? m.statusSummarize()
			: group.status === 'end'
				? m.statusEnd()
				: m.statusWaiting();
	}

	onMount(() => {
		const statusInterval = setInterval(() => {
			status = getGroupStatus();
		}, 1000);

		return () => clearInterval(statusInterval);
	});
</script>

{#if showStatus}
	<span
		class="rounded-full px-2 py-0.5 text-xs {group.status?.startsWith('idle')
			? 'bg-red-100 text-red-600'
			: group.status === 'discussion'
				? 'bg-yellow-100 text-yellow-600'
				: group.status === 'summarize'
					? 'bg-blue-100 text-blue-600'
					: group.status === 'end'
						? 'bg-green-100 text-green-600'
						: 'bg-gray-100 text-gray-600'}"
	>
		{status || getGroupStatus()}
	</span>
{/if}
