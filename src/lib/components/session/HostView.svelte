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
	import { collection, getDocs, onSnapshot } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import { writable } from 'svelte/store';
	import { getUser } from '$lib/utils/getUser';
	import type { Conversation } from '$lib/schema/conversation';
	import { getUserProgress } from '$lib/utils/getUserProgress';
	import { Modal } from 'flowbite-svelte';

	let { session }: { session: Readable<Session> } = $props();
	type GroupWithId = Group & { id: string };
	let groups = writable<GroupWithId[]>([]);
	let participantNames = $state(new Map<string, string>());
	type ParticipantProgress = {
		displayName: string;
		progress: number;
		completedTasks: boolean[];
	};
	let participantProgress = $state(new Map<string, ParticipantProgress>());
	let showChatHistory = $state(false);
	let selectedParticipant = $state<{
		displayName: string;
		history: Array<{
			role: string;
			content: string;
			audio?: string | null;
		}>;
	} | null>(null);

	onMount(async () => {
		try {
			const groupsCollection = collection(db, `sessions/${$page.params.id}/groups`);
			const snapshot = await getDocs(groupsCollection);
			const groupsData: GroupWithId[] = snapshot.docs.map(
				(doc) => ({ id: doc.id, ...doc.data() }) as GroupWithId
			);
			groups.set(groupsData);

			for (const group of groupsData) {
				for (const participant of group.participants) {
					try {
						const userData = await getUser(participant);
						participantNames.set(participant, userData.displayName);
					} catch (error) {
						console.error(`無法獲取使用者 ${participant} 的資料:`, error);
						participantNames.set(participant, '未知使用者');
					}
				}
			}

			for (const group of groupsData) {
				for (const participant of group.participants) {
					const conversationsRef = collection(
						db,
						`sessions/${$page.params.id}/groups/${group.id}/conversations`
					);
					onSnapshot(conversationsRef, async (snapshot) => {
						const conversations = snapshot.docs
							.map((doc) => doc.data() as Conversation)
							.filter((conv) => conv.userId === participant);

						if (conversations.length > 0) {
							const conv = conversations[0];
							const userData = await getUser(participant);
							const totalTasks = conv.subtasks.length;
							const completedCount = conv.subtaskCompleted.filter(Boolean).length;
							const progress = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

							participantProgress.set(participant, {
								displayName: userData.displayName,
								progress,
								completedTasks: conv.subtaskCompleted
							});
						}
					});
				}
			}
		} catch (error) {
			console.error('無法加載群組資料:', error);
		}
	});

	async function handleStartSession() {
		const response = await fetch(`/api/session/${$page.params.id}/action/start-individual`, {
			method: 'POST'
		});

		if (!response.ok) {
			const data = await response.json();
			console.error('Failed to start session:', data.error);
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
					history: conversations[0].history
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
			{#if $session && stageButton[$session.status].show}
				<Button color="primary" on:click={stageButton[$session.status].action}>
					<Play class="mr-2 h-4 w-4" />
					{stageButton[$session.status].text}
				</Button>
			{/if}
		</div>
	</div>

	<div class="grid gap-8 md:grid-cols-4">
		<!-- Status Section -->
		<div class="rounded-lg border p-6">
			<h2 class="mb-4 text-xl font-semibold">Session Status</h2>
			<div class="flex items-center gap-2">
				<span
					class="inline-block h-3 w-3 rounded-full {$session?.status === 'preparing'
						? 'bg-yellow-500'
						: $session?.status === 'individual'
							? 'bg-blue-500'
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
					<QRCode value={`${$page.url.origin}/session/${$page.params.id}`} />
				</div>
			{/if}
		</div>

		<!-- Participant Status Dashboard Section -->
		<div class="col-span-3 rounded-lg border p-6">
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
											{#await getUserProgress($page.params.id, group.id, participant)}
												<div class="flex items-center justify-between text-sm">
													<span class="text-xs">Loading...</span>
												</div>
											{:then progress}
												<div class="flex items-center gap-2">
													<span
														class="min-w-[60px] cursor-pointer text-xs hover:text-primary-600"
														onclick={() => handleParticipantClick(group.id, participant)}
														onkeydown={(e) =>
															e.key === 'Enter' && handleParticipantClick(group.id, participant)}
														role="button"
														tabindex="0"
													>
														{progress.displayName}
													</span>
													<div class="flex h-2">
														{#each progress.completedTasks as completed, i}
															<div
																class="h-full w-8 border-r border-white first:rounded-l last:rounded-r last:border-r-0 {completed
																	? 'bg-green-500'
																	: 'bg-gray-300'}"
																title={$session?.subtasks[i] || `Subtask ${i + 1}`}
															></div>
														{/each}
													</div>
												</div>
											{:catch}
												<div class="text-xs text-red-500">Error loading progress</div>
											{/await}
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
				{#each selectedParticipant.history as message}
					<div class="flex py-2 {message.role === 'user' ? 'justify-end' : 'items-start'}">
						{#if message.role !== 'user'}
							<img src="/DefaultUser.jpg" alt="AI Profile" class="h-12 w-12 rounded-full" />
						{/if}
						<div
							class="leading-1.5 flex max-w-2xl flex-col rounded-xl border-gray-500 bg-gray-200 p-4 dark:bg-gray-900"
						>
							<div>
								<h2 class="text-lg font-bold {message.role === 'user' ? 'text-right' : ''}">
									{message.role === 'user' ? selectedParticipant.displayName : 'AI Assistant'}
								</h2>
								<p class="text-base text-gray-900">{message.content}</p>
							</div>
							{#if message.audio}
								<audio controls>
									<source src={message.audio} type="audio/ogg; codecs=opus" />
								</audio>
							{/if}
						</div>
						{#if message.role === 'user'}
							<img src="/DefaultUser.jpg" alt="User Profile" class="h-12 w-12 rounded-full" />
						{/if}
					</div>
				{/each}
			</div>
		</Modal>
	{/if}
</main>
