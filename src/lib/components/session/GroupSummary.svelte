<script lang="ts">
	import type { Group } from '$lib/schema/group';

	const tagColors = [
		'bg-blue-100 text-blue-700',
		'bg-green-100 text-green-700',
		'bg-purple-100 text-purple-700',
		'bg-pink-100 text-pink-700',
		'bg-yellow-100 text-yellow-700'
	];

	export let group: {
		data: Group;
		id: string;
	};
	export let loading = false;
	export let onRefresh: () => Promise<void>;
	export let onUpdate: (summary: string, keywords: Record<string, number>) => Promise<void>;
	export let readonly = false;

	let isEditing = false;
	let editedSummary = '';
	let editedKeywords: { text: string; weight: number }[] = [];

	$: summaryData = group.data.summary
		? {
				summary: group.data.summary,
				keywords: Object.entries(group.data.keywords || {})
					.map(([text, weight]) => ({
						text,
						weight
					}))
					.sort((a, b) => b.weight - a.weight)
			}
		: null;

	$: if (summaryData && !isEditing) {
		editedSummary = summaryData.summary;
		editedKeywords = summaryData.keywords.map((k) => ({ text: k.text, weight: k.weight }));
	}

	async function handleUpdateSummary() {
		const keywordsObject = Object.fromEntries(
			editedKeywords.map((k) => [
				k.text,
				summaryData?.keywords.find((orig) => orig.text === k.text)?.weight ?? 5
			])
		);
		await onUpdate(editedSummary, keywordsObject);
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
						{#each editedKeywords as keyword}
							<input
								type="text"
								class="mb-2 w-full rounded-lg border p-2 text-gray-700"
								bind:value={keyword.text}
							/>
						{/each}
					{:else}
						<div class="flex flex-wrap gap-2">
							{#each summaryData.keywords as { text }, i}
								<span class="rounded-full px-3 py-1 text-sm {tagColors[i % tagColors.length]}">
									#{text}
								</span>
							{/each}
						</div>
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
