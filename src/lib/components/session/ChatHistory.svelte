<script lang="ts">
	import { Modal, TabItem, Tabs } from 'flowbite-svelte';
	import Chatroom from '$lib/components/Chatroom.svelte';
	import Summary from './Summary.svelte';
	import type { Conversation } from '$lib/schema/conversation';

	let {
		open = $bindable(false),
		participant = null,
		conversation,
		readonly = true
	} = $props<{
		open: boolean;
		participant: {
			displayName: string;
			history: Array<{
				name: string;
				content: string;
				self?: boolean;
				audio?: string;
				avatar?: string;
			}>;
		} | null;
		conversation: {
			data: Conversation;
			id: string;
		};
		readonly?: boolean;
	}>();

	let loadingSummary = $state(false);
</script>

{#if open && participant}
	<Modal bind:open size="xl" outsideclose class="w-full">
		<div class="mb-4">
			<h3 class="text-xl font-semibold">
				{participant.displayName} 的對話記錄
			</h3>
		</div>

		<Tabs style="underline">
			<TabItem open title="對話歷史">
				<div class="messages h-[400px] overflow-y-auto rounded-lg border border-gray-200 p-4">
					<Chatroom readonly conversations={participant.history} />
				</div>
			</TabItem>
			<TabItem title="對話總結">
				<div class="h-[400px] overflow-y-auto rounded-lg border border-gray-200 p-4">
					<Summary
						{conversation}
						loading={loadingSummary}
						onRefresh={() => Promise.resolve()}
						{readonly}
					/>
				</div>
			</TabItem>
		</Tabs>
	</Modal>
{/if}
