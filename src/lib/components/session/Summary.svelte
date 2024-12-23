<script lang="ts">
	import { onMount } from 'svelte';
	import { notifications } from '$lib/stores/notifications';
	import { page } from '$app/stores';
	import type { Group } from '$lib/schema/group';
	import type { Conversation } from '$lib/schema/conversation';

	export let group: {
		data: Group;
		id: string;
	};
	export let conversation: {
		data: Conversation;
		id: string;
	};

	interface SummaryData {
		summary: string;
		keyPoints: string[];
	}

	let summaryData: SummaryData | null = null;
	let loading = false;

	async function fetchSummary() {
		loading = true;
		try {
			const response = await fetch(
				`/api/session/${$page.params.id}/group/${group.id}/conversations/${conversation.id}/summary`
			);

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || '無法獲取總結');
			}

			// 從對話文檔中獲取總結數據
			summaryData = {
				summary: conversation.data.summary || '尚未生成總結',
				keyPoints: conversation.data.keyPoints || []
			};

			notifications.success('��功獲取總結');
		} catch (error) {
			console.error('獲取總結時出錯:', error);
			notifications.error('無法獲取總結');
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		if (conversation.data.summary) {
			summaryData = {
				summary: conversation.data.summary,
				keyPoints: conversation.data.keyPoints || []
			};
		} else {
			// 如果沒有現成的總結，自動調用 API
			await fetchSummary();
		}
	});
</script>

<div class="space-y-6 p-6">
	<div class="flex items-center justify-between">
		<h2 class="text-xl font-semibold">對話總結</h2>
		<button
			class="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
			on:click={fetchSummary}
			disabled={loading}
		>
			{#if loading}
				更新中...
			{:else}
				更新總結
			{/if}
		</button>
	</div>

	{#if summaryData}
		<div class="space-y-4">
			<div>
				<h3 class="mb-2 font-medium">總結內容：</h3>
				<p class="rounded-lg bg-gray-50 p-4 text-gray-700">{summaryData.summary}</p>
			</div>

			{#if summaryData.keyPoints.length > 0}
				<div>
					<h3 class="mb-2 font-medium">關鍵重點：</h3>
					<ul class="list-inside list-disc space-y-2">
						{#each summaryData.keyPoints as point}
							<li class="text-gray-700">{point}</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
	{:else if loading}
		<div class="text-center text-gray-600">
			<p>正在生成總結，請稍候...</p>
		</div>
	{:else}
		<div class="text-center text-gray-600">
			<p>點擊上方按鈕生成對話總結</p>
		</div>
	{/if}
</div>
