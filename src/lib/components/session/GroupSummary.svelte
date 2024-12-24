<script lang="ts">
	import type { Group } from '$lib/schema/group';

	export let group: {
		data: Group;
		id: string;
	};
	export let loading = false;
	export let onRefresh: () => Promise<void>;
	export let onUpdate: (summary: string, keywords: string[]) => Promise<void>;
	export let readonly = false;

	let isEditing = false;
	let editedSummary = '';
	let editedKeywords: string[] = [];

	$: summaryData = group.data.summary
		? {
				summary: group.data.summary,
				keywords: Object.entries(group.data.keywords || {}).map(([, text]) => `${text}`)
			}
		: null;

	$: if (summaryData && !isEditing) {
		editedSummary = summaryData.summary;
		editedKeywords = [...summaryData.keywords];
	}

	async function handleUpdateSummary() {
		await onUpdate(editedSummary, editedKeywords);
		isEditing = false;
	}
</script>

<div class="space-y-6 p-6">
	<div class="flex items-center justify-between">
		<h2 class="text-xl font-semibold">群組討論總結</h2>
		<div class="space-x-2">
			{#if !loading && !readonly}
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
						on:click={onRefresh}
						disabled={loading}
					>
						重新生成總結
					</button>
				{/if}
			{:else if loading}
				<button
					class="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
					disabled={true}
				>
					生成中...
				</button>
			{/if}
		</div>
	</div>

	{#if summaryData}
		<div class="space-y-4">
			<div>
				<h3 class="mb-2 font-medium">討論總結：</h3>
				{#if isEditing && !readonly}
					<textarea
						class="w-full rounded-lg border p-4 text-gray-700"
						bind:value={editedSummary}
						rows="4"
					></textarea>
				{:else}
					<p class="rounded-lg bg-gray-50 p-4 text-gray-700">{summaryData.summary}</p>
				{/if}
			</div>

			{#if summaryData.keywords.length > 0}
				<div>
					<h3 class="mb-2 font-medium">討論關鍵字：</h3>
					{#if isEditing && !readonly}
						<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
						{#each editedKeywords as _, i}
							<input
								type="text"
								class="mb-2 w-full rounded-lg border p-2 text-gray-700"
								bind:value={editedKeywords[i]}
							/>
						{/each}
					{:else}
						<ul class="list-inside list-disc space-y-2">
							{#each summaryData.keywords as point}
								<li class="text-gray-700">{point}</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/if}
		</div>
	{:else if loading}
		<div class="text-center text-gray-600">
			<p>正在生成討論總結，請稍候...</p>
		</div>
	{:else}
		<div class="text-center text-gray-600">
			<p>尚無討論總結</p>
		</div>
	{/if}
</div>
