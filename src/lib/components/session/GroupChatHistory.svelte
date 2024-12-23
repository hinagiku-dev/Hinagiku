<script lang="ts">
	import { Modal, TabItem, Tabs } from 'flowbite-svelte';
	import Chatroom from '$lib/components/Chatroom.svelte';
	import GroupSummary from './GroupSummary.svelte';
	import type { Group } from '$lib/schema/group';

	let {
		open = $bindable(false),
		group = null,
		readonly = true
	} = $props<{
		open: boolean;
		group: {
			data: Group;
			id: string;
			discussions: Array<{
				name: string;
				content: string;
				self?: boolean;
				audio?: string;
				avatar?: string;
			}>;
		} | null;
		readonly?: boolean;
	}>();

	let loadingGroupSummary = $state(false);
</script>

{#if open && group}
	<Modal bind:open size="xl" outsideclose class="w-full">
		<div class="mb-4">
			<h3 class="text-xl font-semibold">
				第 {group.data.number} 組的討論記錄
			</h3>
		</div>

		<Tabs style="underline">
			<TabItem open title="討論歷史">
				<div class="messages h-[400px] overflow-y-auto rounded-lg border border-gray-200 p-4">
					<Chatroom readonly conversations={group.discussions} />
				</div>
			</TabItem>
			<TabItem title="討論總結">
				<div class="h-[400px] overflow-y-auto rounded-lg border border-gray-200 p-4">
					<GroupSummary
						{group}
						loading={loadingGroupSummary}
						onRefresh={() => Promise.resolve()}
						onUpdate={() => Promise.resolve()}
						{readonly}
					/>
				</div>
			</TabItem>
		</Tabs>
	</Modal>
{/if}
