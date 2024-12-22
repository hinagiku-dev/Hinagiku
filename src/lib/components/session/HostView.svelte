<script lang="ts">
	import { Play } from 'lucide-svelte';
	import type { Session } from '$lib/schema/session';
	import type { Readable } from 'svelte/store';
	import QRCode from '$lib/components/QRCode.svelte';
	import { Button } from 'flowbite-svelte';
	import { notifications } from '$lib/stores/notifications';
	import { page } from '$app/stores';
	import { Alert } from 'flowbite-svelte';
	import type { Group } from '$lib/schema/group';
	import { onMount } from 'svelte';
	import { collection, getDocs, onSnapshot, getDoc, doc } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import { writable } from 'svelte/store';
	import { getUser } from '$lib/utils/getUser';
	import type { Conversation } from '$lib/schema/conversation';
	import { Modal } from 'flowbite-svelte';
	import Chatroom from '$lib/components/Chatroom.svelte';
	import { X } from 'lucide-svelte';
	import { SvelteMap } from 'svelte/reactivity';

	let { session }: { session: Readable<Session> } = $props();
	let code = $state('Code generate error');
	type GroupWithId = Group & { id: string };
	let groups = writable<GroupWithId[]>([]);
	let participantNames = $state(new Map<string, string>());
	type ParticipantProgress = {
		displayName: string;
		progress: number;
		completedTasks: boolean[];
	};
	let participantProgress = $state(new SvelteMap<string, ParticipantProgress>());
	let showChatHistory = $state(false);
	let selectedParticipant = $state<{
		displayName: string;
		history: Array<{
			name: string;
			content: string;
			self?: boolean;
			audio?: string;
			avatar?: string;
		}>;
	} | null>(null);

	onMount(() => {
		const unsubscribes: (() => void)[] = [];
		const initializeSession = async () => {
			try {
				const codeCollection = doc(db, 'temp_codes', $page.params.id);
				const codeDoc = await getDoc(codeCollection);
				code = codeDoc.data()?.code;
				const groupsCollection = collection(db, `sessions/${$page.params.id}/groups`);
				const groupChecked = new Set<string>();
				const unsubscribe = onSnapshot(groupsCollection, (snapshot) => {
					const groupsData: GroupWithId[] = snapshot.docs.map(
						(doc) => ({ id: doc.id, ...doc.data() }) as GroupWithId
					);
					groups.set(groupsData);

					groupsData.forEach(async (group) => {
						for (const participant of group.participants) {
							try {
								const userData = await getUser(participant);
								participantNames.set(participant, userData.displayName);
							} catch (error) {
								console.error(`無法獲取使用者 ${participant} 的資料:`, error);
								participantNames.set(participant, '未知使用者');
							}
						}

						if (!groupChecked.has(group.id)) {
							groupChecked.add(group.id);

							const conversationsRef = collection(
								db,
								`sessions/${$page.params.id}/groups/${group.id}/conversations`
							);
							const unsubscribe = onSnapshot(conversationsRef, async (snapshot) => {
								const conversations = snapshot.docs.map((doc) => doc.data() as Conversation);
								for (const conv of conversations) {
									const userData = await getUser(conv.userId);
									const totalTasks = conv.subtasks.length;
									const completedCount = conv.subtaskCompleted.filter(Boolean).length;
									const progress = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

									participantProgress.set(conv.userId, {
										displayName: userData.displayName,
										progress,
										completedTasks: conv.subtaskCompleted
									});
								}
							});
							unsubscribes.push(unsubscribe);
						}
					});
				});
				unsubscribes.push(unsubscribe);
			} catch (error) {
				console.error('無法加載群組資料:', error);
			}
		};

		initializeSession();

		return () => {
			unsubscribes.forEach((unsubscribe) => unsubscribe());
		};
	});

	async function handleStartSession() {
		try {
			// 為每個群組的每個參與者創建對話
			for (const group of $groups) {
				for (const participant of group.participants) {
					const response = await fetch(
						`/api/session/${$page.params.id}/group/${group.id}/conversations`,
						{
							method: 'POST',
							headers: {
								'Content-Type': 'application/json'
							},
							body: JSON.stringify({
								task: $session?.task || '',
								subtasks: $session?.subtasks || [],
								resources: $session?.resources.map((r) => r.content) || [],
								participant: participant
							})
						}
					);

					if (!response.ok) {
						const data = await response.json();
						notifications.error(
							data.error || `無法為參與者 ${participantNames.get(participant)} 創建對話`
						);
						return;
					}
				}
			}

			// 更新 session 狀態
			const statusResponse = await fetch(
				`/api/session/${$page.params.id}/action/start-individual`,
				{
					method: 'POST'
				}
			);

			if (!statusResponse.ok) {
				const data = await statusResponse.json();
				notifications.error(data.error || '無法開始個人階段');
				return;
			}

			notifications.success('成功開始個人階段', 3000);
		} catch (error) {
			console.error('無法開始個人階段:', error);
			notifications.error('無法開始個人階段');
		}
	}

	async function handleEndIndividual() {
		const response = await fetch(`/api/session/${$page.params.id}/action/end-individual`, {
			method: 'POST'
		});

		if (!response.ok) {
			const data = await response.json();
			console.error('Failed to end individual stage:', data.error);
		}
	}

	async function handleStartGroup() {
		const response = await fetch(`/api/session/${$page.params.id}/action/start-group`, {
			method: 'POST'
		});

		if (!response.ok) {
			const data = await response.json();
			console.error('Failed to start group stage:', data.error);
		}
	}

	async function handleEndGroup() {
		const response = await fetch(`/api/session/${$page.params.id}/action/end-group`, {
			method: 'POST'
		});

		if (!response.ok) {
			const data = await response.json();
			console.error('Failed to end group stage:', data.error);
		}
	}

	async function handleRemoveParticipant(groupId: string, participant: string) {
		try {
			const response = await fetch(
				`/api/session/${$page.params.id}/group/${groupId}/join/${participant}`,
				{
					method: 'DELETE'
				}
			);

			if (!response.ok) {
				throw new Error('Failed to remove participant');
			}

			notifications.success('成功移除參與者', 3000);
		} catch (error) {
			console.error('無法移除參與者:', error);
			notifications.error('無法移除參與者');
		}
	}

	const stageButton = $derived({
		preparing: {
			text: 'Start Individual Stage',
			action: handleStartSession,
			show: true
		},
		individual: {
			text: 'End Individual Stage',
			action: handleEndIndividual,
			show: true
		},
		'before-group': {
			text: 'Start Group Stage',
			action: handleStartGroup,
			show: true
		},
		group: {
			text: 'End Group Stage',
			action: handleEndGroup,
			show: true
		},
		ended: {
			text: 'Session Ended',
			action: () => {
				notifications.error('Already Ended', 3000);
			},
			show: false
		}
	});

	async function handleParticipantClick(groupId: string, participant: string) {
		try {
			const conversationsRef = collection(
				db,
				`sessions/${$page.params.id}/groups/${groupId}/conversations`
			);
			const snapshot = await getDocs(conversationsRef);
			const conversations = snapshot.docs
				.map((doc) => doc.data() as Conversation)
				.filter((conv) => conv.userId === participant);

			if (conversations.length > 0) {
				const userData = await getUser(participant);
				selectedParticipant = {
					displayName: userData.displayName,
					history: conversations[0].history.map((message) => ({
						name: message.role === 'user' ? userData.displayName : 'AI Assistant',
						content: message.content,
						self: message.role === 'user',
						audio: message.audio || undefined
					}))
				};
				showChatHistory = true;
			}
		} catch (error) {
			console.error('無法加載對話歷史:', error);
			notifications.error('無法加載對話歷史');
		}
	}
</script>

<main class="mx-auto max-w-7xl px-4 py-16">
	<div class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">{$session?.title}</h1>
		</div>

		<div class="flex items-center gap-4">
			{#if $session?.status === 'individual'}
				<div class="flex items-center gap-2">
					<span class="inline-block h-3 w-3 rounded-full bg-blue-500"></span>
					<span class="capitalize">Individual Stage</span>
				</div>
			{/if}
			{#if $session && stageButton[$session.status].show}
				<Button color="primary" on:click={stageButton[$session.status].action}>
					<Play class="mr-2 h-4 w-4" />
					{stageButton[$session.status].text}
				</Button>
			{/if}
		</div>
	</div>

	<div class="grid gap-8 md:grid-cols-4">
		{#if $session?.status && $session.status !== 'individual'}
			<div class="rounded-lg border p-6">
				<h2 class="mb-4 text-xl font-semibold">Session Status</h2>
				<div class="flex items-center gap-2">
					<span
						class="inline-block h-3 w-3 rounded-full {$session?.status === 'preparing'
							? 'bg-yellow-500'
							: $session?.status === 'before-group'
								? 'bg-purple-500'
								: $session?.status === 'group'
									? 'bg-green-500'
									: 'bg-gray-500'}"
					></span>
					<span class="capitalize">{$session?.status}</span>
				</div>

				{#if $session?.status === 'preparing'}
					<div class="mt-4">
						<h3 class="mb-2 font-medium">Session QR Code</h3>
						<div class="flex justify-center">
							<QRCode value={`${$page.url.origin}/session/${$page.params.id}`} />
						</div>
					</div>
					<div class="mt-4">
						<h3 class="mb-2 font-medium">Session Code</h3>
						<p class="text-center text-5xl font-bold text-orange-600">{code}</p>
					</div>
				{/if}
			</div>
		{/if}

		<div
			class="col-span-3 rounded-lg border p-6 {$session?.status === 'individual'
				? 'md:col-span-4'
				: ''}"
		>
			<h2 class="mb-4 text-xl font-semibold">Groups</h2>
			{#if $groups.length === 0}
				<Alert color="blue">Loading groups...</Alert>
			{:else}
				<div class="grid grid-cols-3 gap-4">
					{#each [...$groups].sort((a, b) => a.number - b.number) as group}
						<div class="rounded border p-3">
							<h3 class="mb-2 text-sm font-semibold">Group #{group.number}</h3>
							{#if group.participants.length === 0}
								<p class="text-xs text-gray-500">No participants</p>
							{:else}
								<ul class="space-y-2">
									{#each group.participants as participant}
										<li class="space-y-1">
											{#if participantProgress.has(participant)}
												<div class="flex items-center gap-2">
													<span
														class="min-w-[60px] cursor-pointer text-xs hover:text-primary-600"
														onclick={() => handleParticipantClick(group.id, participant)}
														onkeydown={(e) =>
															e.key === 'Enter' && handleParticipantClick(group.id, participant)}
														role="button"
														tabindex="0"
													>
														{participantProgress.get(participant)?.displayName}
													</span>
													<div class="flex h-2">
														{#each participantProgress.get(participant)?.completedTasks || [] as completed, i}
															<div
																class="h-full w-8 border-r border-white first:rounded-l last:rounded-r last:border-r-0 {completed
																	? 'bg-green-500'
																	: 'bg-gray-300'}"
																title={$session?.subtasks[i] || `Subtask ${i + 1}`}
															></div>
														{/each}
													</div>
													<button
														class="ml-auto rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-red-500"
														onclick={() => handleRemoveParticipant(group.id, participant)}
														title="移除參與者"
													>
														<X class="h-4 w-4" />
													</button>
												</div>
											{:else}
												<div class="flex items-center justify-between text-sm">
													<span class="text-xs">Loading...</span>
												</div>
											{/if}
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Task Section -->
		<div class="col-span-4 rounded-lg border p-6">
			<h2 class="mb-4 text-xl font-semibold">Main Task</h2>
			<p class="text-gray-700">{$session?.task}</p>

			{#if $session?.subtasks.length > 0}
				<div class="mt-4">
					<h3 class="mb-2 font-medium">Subtasks:</h3>
					<ul class="list-inside list-disc space-y-2">
						{#each $session?.subtasks as subtask}
							<li class="text-gray-700">{subtask}</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>

		<!-- Resources Section -->
		<div class="col-span-4 rounded-lg border p-6">
			<h2 class="mb-4 text-xl font-semibold">Resources</h2>
			{#if $session?.resources.length === 0}
				<p class="text-gray-600">No resources available</p>
			{:else}
				<div class="space-y-4">
					{#each $session?.resources as resource}
						<div class="rounded-lg border p-4">
							<h3 class="font-medium">{resource.name}</h3>
							<p class="mt-2 text-gray-700">{resource.content}</p>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	{#if showChatHistory && selectedParticipant}
		<Modal bind:open={showChatHistory} size="xl" autoclose outsideclose class="w-full">
			<div class="mb-4">
				<h3 class="text-xl font-semibold">
					{selectedParticipant.displayName} 的對話歷史
				</h3>
			</div>
			<div class="messages h-[400px] overflow-y-auto rounded-lg border border-gray-200 p-4">
				<Chatroom readonly conversations={selectedParticipant.history} />
			</div>
		</Modal>
	{/if}
</main>
