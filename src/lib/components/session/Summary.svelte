<script lang="ts">
	import type { Conversation } from '$lib/schema/conversation';

	export let conversation: {
		data: Conversation;
		id: string;
	};
	export let loading = false;
	export let onRefresh: () => Promise<void>;
	export let readonly = false;

	$: summaryData = conversation.data.summary
		? {
				summary: conversation.data.summary,
				keyPoints: conversation.data.keyPoints || []
			}
		: null;
</script>

<div class="space-y-6 p-6">
	<div class="flex items-center justify-between">
		<h2 class="text-xl font-semibold">對話總結</h2>
		{#if !readonly}
			<button
				class="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
				on:click={onRefresh}
				disabled={loading}
			>
				{#if loading}
					更新中...
				{:else}
					更新總結
				{/if}
			</button>
		{/if}
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
