<script lang="ts">
	import type { Conversation } from '$lib/schema/conversation';
	import { renderMarkdown } from '$lib/utils/renderMarkdown';
	export let conversation: {
		data: Conversation;
		id: string;
	};
	export let loading = false;
	export let onRefresh: (presentation?: string, textStyle?: string) => Promise<void>;
	export let onUpdate: (summary: string, keyPoints: string[]) => Promise<void>;
	export let readonly = false;
	let presentation = 'paragraph';
	let textStyle = 'default';

	let isEditing = false;
	let editedSummary = '';
	let editedKeyPoints: string[] = [];

	$: summaryData = conversation.data.summary
		? {
				summary: conversation.data.summary,
				keyPoints: conversation.data.keyPoints || []
			}
		: null;

	$: if (summaryData && !isEditing) {
		editedSummary = summaryData.summary;
		editedKeyPoints = [...(summaryData.keyPoints || [])];
	}

	$: if (conversation.data) {
		presentation = conversation.data.presentation || 'paragraph';
		textStyle = conversation.data.textStyle || 'default';
	}

	async function handleUpdateSummary() {
		await onUpdate(editedSummary, editedKeyPoints);
		isEditing = false;
	}
</script>

<div class="space-y-6 p-6">
	<div class="flex items-center justify-between">
		<h2 class="text-xl font-semibold">對話總結</h2>
		<div class="flex items-center space-x-2">
			{#if !readonly}
				<button
					class="rounded-lg bg-gray-500 px-4 py-2 text-white hover:bg-gray-600 disabled:opacity-50"
					on:click={isEditing ? handleUpdateSummary : () => (isEditing = true)}
					disabled={loading}
				>
					{isEditing ? '儲存' : '編輯'}
				</button>

				{#if !isEditing}
					<button
						class="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
						on:click={() => onRefresh(presentation, textStyle)}
						disabled={loading}
					>
						{loading ? '重新生成中...' : '重新生成總結'}
					</button>
				{/if}
			{/if}
		</div>
	</div>

	{#if summaryData}
		<div class="space-y-4">
			<div>
				<h3 class="mb-2 font-medium">
					總結內容：
					<select bind:value={presentation} class="rounded border px-2 py-1 text-sm">
						<option value="paragraph">段落(預設)</option>
						<option value="list2">列 2 點</option>
						<option value="list3">列 3 點</option>
						<option value="list4">列 4 點</option>
						<option value="list5">列 5 點</option>
					</select>
					<select bind:value={textStyle} class="rounded border px-2 py-1 text-sm">
						<option value="default">預設</option>
						<option value="humor">幽默</option>
						<option value="serious">嚴肅</option>
						<option value="casual">輕鬆</option>
						<option value="cute">可愛</option>
					</select>
				</h3>
				{#if isEditing && !readonly}
					<textarea
						class="w-full rounded-lg border p-4 text-gray-700"
						bind:value={editedSummary}
						rows="4"
					></textarea>
				{:else}
					<p class="rounded-lg bg-gray-50 p-4 text-gray-700">
						{#await renderMarkdown(summaryData.summary)}
							Loading ...
						{:then content}
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							{@html content}
						{/await}
					</p>
				{/if}
			</div>

			{#if summaryData.keyPoints.length > 0}
				<div>
					<h3 class="mb-2 font-medium">關鍵重點：</h3>
					{#if isEditing && !readonly}
						{#each editedKeyPoints as text}
							<input
								type="text"
								class="mb-2 w-full rounded-lg border p-2 text-gray-700"
								bind:value={text}
							/>
						{/each}
						<button
							class="mt-2 rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600"
							on:click={() => (editedKeyPoints = [...editedKeyPoints, ''])}
						>
							新增重點
						</button>
					{:else}
						<ul class="list-inside list-disc space-y-2">
							{#each summaryData.keyPoints as point}
								<li class="text-gray-700">{point}</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/if}
		</div>
	{:else if loading}
		<div class="text-center text-gray-600">
			<p>正在生成總結，請稍候...</p>
		</div>
	{:else}
		<div class="text-center text-gray-600">
			<p>尚無對話總結</p>
		</div>
	{/if}
</div>
