<script lang="ts">
	import { X, TriangleAlert, MessageSquareOff } from 'lucide-svelte';
	import type { Session } from '$lib/schema/session';
	import type { Readable } from 'svelte/store';
	import QRCode from '$lib/components/QRCode.svelte';
	import { Button } from 'flowbite-svelte';
	import { notifications } from '$lib/stores/notifications';
	import { page } from '$app/stores';
	import { Alert } from 'flowbite-svelte';
	import type { Group } from '$lib/schema/group';
	import { onMount } from 'svelte';
	import {
		collection,
		getDocs,
		onSnapshot,
		Timestamp,
		query,
		where,
		limit
	} from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import { writable } from 'svelte/store';
	import { getUser } from '$lib/utils/getUser';
	import type { Conversation } from '$lib/schema/conversation';
	import { SvelteMap } from 'svelte/reactivity';
	import { renderMarkdown } from '$lib/utils/renderMarkdown';
	import ChatHistory from './ChatHistory.svelte';
	import GroupChatHistory from './GroupChatHistory.svelte';
	import GroupStatus from './GroupStatus.svelte';
	import StageProgress from './StageProgress.svelte';
	import WordCloud from './WordCloud.svelte';
	import MostActiveParticipants from './MostActiveParticipants.svelte';
	import MostActiveGroups from './MostActiveGroups.svelte';

	let { session }: { session: Readable<Session> } = $props();
	let code = $state('');
	type GroupWithId = Group & {
		id: string;
		updatedAt: Timestamp | undefined;
	};
	let groups = writable<GroupWithId[]>([]);
	let participantNames = $state(new Map<string, string>());
	type ParticipantProgress = {
		displayName: string;
		progress: number;
		completedTasks: boolean[];
		warning: {
			moderation: boolean;
			offTopic: number;
		};
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
	let selectedConversation = $state<{ data: Conversation; id: string } | null>(null);
	let showGroupChatHistory = $state(false);
	let selectedGroup = $state<{
		data: Group;
		id: string;
		discussions: Array<{
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
										completedTasks: conv.subtaskCompleted,
										warning: {
											moderation: conv.warning.moderation,
											offTopic: conv.warning.offTopic
										}
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

	// 生成代碼
	async function genCode() {
		const response = await fetch(`/api/session/${$page.params.id}/action/generate-code`, {
			method: 'POST'
		});
		if (!response.ok) {
			const data = await response.json();
			notifications.error(data.error || '無法生成代碼');
			return '';
		}
		const data = await response.json();
		return data.code.toString();
	}

	async function getCode() {
		const codeQuery = query(
			collection(db, 'temp_codes'),
			where('sessionId', '==', $page.params.id),
			limit(1)
		);
		const codeDoc = (await getDocs(codeQuery)).docs[0];
		//console.log(codeDoc.data());

		if (!codeDoc || Timestamp.now().toMillis() - codeDoc.data()?.createTime.toMillis() > 3600000) {
			code = await genCode();
		} else {
			code = codeDoc.id;
		}
	}

	async function handleStartSession() {
		try {
			// 為每個群組的個參與者創建對話
			const responses = await Promise.all(
				$groups.map((group) =>
					fetch(`/api/session/${$page.params.id}/group/${group.id}/conversations`, {
						method: 'GET',
						headers: {
							'Content-Type': 'application/json'
						}
					})
				)
			);

			// 檢查是否有任何請求失敗
			const failedResponse = responses.find((response) => !response.ok);
			if (failedResponse) {
				const data = await failedResponse.json();
				notifications.error(data.error || '無法為部分群組的參與者創建對話');
				return;
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

	async function handleRemoveWarning(groupId: string, participant: string) {
		try {
			const conversationsRef = collection(
				db,
				`sessions/${$page.params.id}/groups/${groupId}/conversations`
			);
			const snapshot = await getDocs(conversationsRef);
			const conversationDoc = snapshot.docs.find(
				(doc) => (doc.data() as Conversation).userId === participant
			);

			if (!conversationDoc) {
				throw new Error('Conversation not found');
			}

			const response = await fetch(
				`/api/session/${$page.params.id}/group/${groupId}/conversations/${conversationDoc.id}/remove/warning`,
				{
					method: 'GET'
				}
			);

			if (!response.ok) {
				throw new Error('Failed to remove warning');
			}

			notifications.success('成功移除警告', 3000);
		} catch (error) {
			console.error('無法移除警告:', error);
			notifications.error('無法移除警告');
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
				const conversation = {
					data: conversations[0],
					id: snapshot.docs[0].id
				};
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
				selectedConversation = conversation;
			}
		} catch (error) {
			console.error('無法加載對話歷史:', error);
			notifications.error('無法加載對話歷史');
		}
	}

	async function handleGroupClick(group: GroupWithId) {
		try {
			const discussions = group.discussions.map((discussion) => ({
				name: discussion.speaker,
				content: discussion.content,
				self: false,
				audio: discussion.audio || undefined
			}));

			selectedGroup = {
				data: group,
				id: group.id,
				discussions
			};
			showGroupChatHistory = true;
		} catch (error) {
			console.error('無法加載群組討論:', error);
			notifications.error('無法加載群組討論');
		}
	}

	async function handlePreparing() {
		await fetch(`/api/session/${$page.params.id}/action/preparing`, {
			method: 'POST'
		});
	}

	async function handleStageChange(newStage: string) {
		const actions = {
			preparing: handlePreparing,
			individual: handleStartSession,
			'before-group': handleEndIndividual,
			group: handleStartGroup,
			ended: handleEndGroup
		};

		try {
			await actions[newStage as keyof typeof actions]();
		} catch (error) {
			console.error('Failed to change stage:', error);
			notifications.error('Failed to change stage');
		}
	}
</script>

<main class="mx-auto max-w-7xl px-4 py-16">
	<div class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">{$session?.title}</h1>
		</div>

		<div class="flex items-center gap-6">
			<StageProgress
				session={$session}
				onStageChange={handleStageChange}
				showAction={$session && stageButton[$session.status].show}
			/>
		</div>
	</div>

	<div class="grid gap-8 md:grid-cols-4">
		{#if $session?.status && $session.status === 'preparing'}
			<div class="rounded-lg border p-6">
				<h2 class="mb-4 text-xl font-semibold">Join Session</h2>
				<p class="text-gray-700">Please scan the QR code or enter the code to join the session.</p>
				{#if $session?.status === 'preparing'}
					<div class="mt-4">
						<div class="flex justify-center">
							<QRCode value={`${$page.url.origin}/session/${$page.params.id}`} />
						</div>
					</div>
					<div class="mt-4">
						{#if code === ''}
							<div class="flex justify-center">
								<Button color="primary" on:click={getCode}>Show Code</Button>
							</div>
						{:else}
							<p class="text-center text-5xl font-bold text-orange-600">{code}</p>
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		{#if $session?.status === 'ended'}
			<div class="col-span-4 rounded-lg border p-6">
				<h2 class="mb-4 text-xl font-semibold">Final Summary</h2>
				<div class="flex w-full flex-col gap-4">
					<div class="h-96">
						<WordCloud />
					</div>
					<div class="flex w-full gap-4">
						<div class="h-96 flex-1">
							<MostActiveParticipants />
						</div>
						<div class="h-96 flex-1">
							<MostActiveGroups />
						</div>
					</div>
				</div>
			</div>
		{/if}

		<div
			class="col-span-3 rounded-lg border p-6 {$session?.status !== 'preparing'
				? 'md:col-span-4'
				: ''}"
		>
			<h2 class="mb-4 text-xl font-semibold">Groups</h2>
			{#if $groups.length === 0}
				<Alert>Waiting for participants to join groups...</Alert>
			{:else}
				<div class="grid grid-cols-3 gap-4">
					{#each [...$groups].sort((a, b) => a.number - b.number) as group}
						<div class="rounded border p-3">
							<div class="mb-2 flex items-center justify-between">
								<button
									class="cursor-pointer text-sm font-semibold hover:text-primary-600"
									onclick={() => handleGroupClick(group)}
									onkeydown={(e) => e.key === 'Enter' && handleGroupClick(group)}
								>
									Group #{group.number}
								</button>
								<GroupStatus {group} showStatus={$session?.status === 'group'} />
							</div>
							{#if group.participants.length === 0}
								<p class="text-xs text-gray-500">No participants</p>
							{:else}
								<ul class="space-y-1.5">
									{#each group.participants as participant}
										<li>
											<div class="flex items-center gap-1.5">
												<div class="flex flex-1 items-center gap-1.5">
													<span
														class="min-w-[50px] cursor-pointer text-xs hover:text-primary-600"
														onclick={() => handleParticipantClick(group.id, participant)}
														onkeydown={(e) =>
															e.key === 'Enter' && handleParticipantClick(group.id, participant)}
														role="button"
														tabindex="0"
													>
														{#await getUser(participant) then userData}
															{userData.displayName}
														{/await}
													</span>
													{#if participantProgress.has(participant)}
														<div class="flex flex-1 items-center gap-1.5">
															<div class="flex h-1.5 flex-1">
																{#each participantProgress.get(participant)?.completedTasks || [] as completed, i}
																	<div
																		class="h-full flex-1 border-r border-white first:rounded-l last:rounded-r last:border-r-0 {completed
																			? 'bg-green-500'
																			: 'bg-gray-300'}"
																		title={$session?.subtasks[i] || `Subtask ${i + 1}`}
																	></div>
																{/each}
															</div>

															{#if participantProgress.get(participant)?.warning}
																{@const warning = participantProgress.get(participant)?.warning}
																{#if warning}
																	<div
																		class="flex h-full min-w-[3rem] shrink-0 items-center justify-center rounded-full px-1.5 {warning.moderation
																			? 'bg-red-500'
																			: warning.offTopic >= 3
																				? 'bg-orange-400'
																				: ''}"
																	>
																		{#if warning.moderation}
																			<button
																				class="flex items-center justify-center"
																				onclick={() => handleRemoveWarning(group.id, participant)}
																				title="點擊移除內容警告"
																			>
																				<TriangleAlert
																					class="h-3 w-3 text-white hover:text-gray-200"
																				/>
																			</button>
																		{:else if warning.offTopic >= 3}
																			<MessageSquareOff
																				class="h-3 w-3 text-white"
																				aria-label="離題警告"
																			/>
																		{/if}
																	</div>
																{/if}
															{/if}
														</div>
													{/if}
												</div>
												<button
													class="shrink-0 rounded p-0.5 text-gray-500 hover:bg-gray-100 hover:text-red-500"
													onclick={() => handleRemoveParticipant(group.id, participant)}
													title="移除參與者"
												>
													<X class="h-3 w-3" />
												</button>
											</div>
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
							<p class="prose prose-hina mt-2 text-gray-700">
								{#await renderMarkdown(resource.content)}
									Loading ...
								{:then content}
									<!-- eslint-disable-next-line svelte/no-at-html-tags -->
									{@html content}
								{/await}
							</p>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	{#if showChatHistory && selectedParticipant && selectedConversation}
		<ChatHistory
			bind:open={showChatHistory}
			participant={selectedParticipant}
			conversation={selectedConversation}
		/>
	{/if}

	{#if showGroupChatHistory && selectedGroup}
		<GroupChatHistory bind:open={showGroupChatHistory} group={selectedGroup} readonly={true} />
	{/if}
</main>
