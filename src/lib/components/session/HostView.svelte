<script lang="ts">
	import { X, TriangleAlert, MessageSquareOff } from 'lucide-svelte';
	import type { Session } from '$lib/schema/session';
	import type { Readable } from 'svelte/store';
	import QRCode from '$lib/components/QRCode.svelte';
	import { Button, Tooltip } from 'flowbite-svelte';
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
		limit,
		doc
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
	import LabelManager from './LabelManager.svelte';
	import ResolveUsername from '../ResolveUsername.svelte';
	import { language } from '$lib/stores/language'; // Import the global language store

	let { session }: { session: Readable<Session> } = $props();
	let code = $state('');
	type GroupWithId = Group & {
		id: string;
		updatedAt: Timestamp | undefined;
	};
	let groups = writable<GroupWithId[]>([]);
	let participantNames = writable(new Map<string, string>());
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
	let conversationsData = $state<Array<Conversation>>([]);
	let keywordData = $state<Record<string, number>>({});

	const translations = {
		en: {
			joinSession: 'Join Session',
			joinSessionDesc: 'Please scan the QR code or enter the code to join the session.',
			showCode: 'Show Code',
			showCodeDesc: 'Show a 6-digit code for participants to join the session.',
			finalSummary: 'Final Summary',
			mainTask: 'Main Task',
			subtasks: 'Subtasks:',
			resources: 'Resources',
			noResources: 'No resources available',
			waitingForParticipants: 'Waiting for participants to join groups...',
			noParticipants: 'No participants',
			removeParticipant: 'Remove participant',
			openChatHistory: 'Open chat history',
			openGroupChatHistory: 'Open group chat history',
			warningInappropriate: 'Warning: inappropriate content detected.',
			warningOffTopic: 'Warning: many off-topic messages.'
		},
		zh: {
			joinSession: '加入會話',
			joinSessionDesc: '請掃描二維碼或輸入代碼以加入會話。',
			showCode: '顯示代碼',
			showCodeDesc: '顯示一個6位數的代碼供參與者加入會話。',
			finalSummary: '最終總結',
			mainTask: '主要任務',
			subtasks: '子任務:',
			resources: '資源',
			noResources: '沒有可用資源',
			waitingForParticipants: '等待參與者加入小組...',
			noParticipants: '沒有參與者',
			removeParticipant: '移除參與者',
			openChatHistory: '打開聊天記錄',
			openGroupChatHistory: '打開小組聊天記錄',
			warningInappropriate: '警告：檢測到不適當內容。',
			warningOffTopic: '警告：許多離題消息。'
		}
	};

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

					const allParticipants = new Set<string>();
					groupsData.forEach((group) => {
						group.participants.forEach((participant) => {
							allParticipants.add(participant);
						});
					});

					allParticipants.forEach((participant) => {
						const profileRef = doc(db, 'profiles', participant);
						const unsubscribe = onSnapshot(
							profileRef,
							(doc) => {
								const profile = doc.data();
								if (profile) {
									participantNames.update((names) => {
										const newNames = new Map(names);
										newNames.set(participant, profile.displayName);
										return newNames;
									});
								}
							},
							(error) => {
								console.error(`無法監聽使用者 ${participant} 的資料:`, error);
								participantNames.update((names) => {
									const newNames = new Map(names);
									newNames.set(participant, '未知使用者');
									return newNames;
								});
							}
						);
						unsubscribes.push(unsubscribe);
					});

					groupsData.forEach(async (group) => {
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
		code = 'Loading...';
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
				`/api/session/${$page.params.id}/group/${groupId}/leave/${participant}`,
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
						name: message.role === 'user' ? userData.displayName : '小菊(Hinagiku)',
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

	async function loadConversationsData() {
		try {
			if (!$page.params.id) return;

			const response = await fetch(
				`/api/session/${$page.params.id}/conversations/most-active-participants`
			);
			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || '無法獲取對話資料');
			}

			conversationsData = await response.json();
			console.log(conversationsData);
		} catch (error) {
			console.error('無法加載對話資料:', error);
			notifications.error('無法加載對話資料');
		}
	}

	async function loadKeywordData() {
		try {
			if (!$page.params.id) return;

			const response = await fetch(`/api/session/${$page.params.id}/conversations/keywords`);
			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || '無法獲取關鍵字資料');
			}

			keywordData = await response.json();
		} catch (error) {
			console.error('無法加載關鍵字資料:', error);
			notifications.error('無法加載關鍵字資料');
		}
	}

	$effect(() => {
		if ($session?.status === 'ended') {
			loadConversationsData();
			loadKeywordData();
		}
	});
</script>

<main class="mx-auto max-w-7xl px-4 py-16">
	<div class="mb-8 flex flex-col gap-4">
		{#if $session?.status === 'preparing'}
			<LabelManager sessionId={$page.params.id} labels={$session?.labels || []} />
		{:else if $session?.labels?.length}
			<div class="flex items-center gap-2">
				{#each $session.labels as label}
					<span class="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
						{label}
					</span>
				{/each}
			</div>
		{/if}
		<div class="flex items-center justify-between">
			<h1 class="text-3xl font-bold">
				{$session?.title}
			</h1>

			<div class="flex items-center gap-6">
				<StageProgress
					session={$session}
					onStageChange={handleStageChange}
					showAction={$session && stageButton[$session.status].show}
				/>
			</div>
		</div>
	</div>

	<div class="grid gap-8 md:grid-cols-4">
		{#if $session?.status && $session.status === 'preparing'}
			<div class="rounded-lg border p-6">
				<h2 class="mb-4 text-xl font-semibold">
					{$language === 'zh' ? translations.zh.joinSession : translations.en.joinSession}
				</h2>
				<p class="text-gray-700">
					{$language === 'zh' ? translations.zh.joinSessionDesc : translations.en.joinSessionDesc}
				</p>
				{#if $session?.status === 'preparing'}
					<div class="mt-4">
						<div class="flex justify-center">
							<QRCode value={`${$page.url.origin}/session/${$page.params.id}`} />
						</div>
					</div>
					<div class="mt-4">
						{#if code === '' || code === 'Loading...'}
							<div class="flex justify-center">
								<Button color="primary" on:click={getCode} disabled={code === 'Loading...'}>
									{$language === 'zh' ? translations.zh.showCode : translations.en.showCode}
								</Button>
								<Tooltip placement="bottom">
									{$language === 'zh' ? translations.zh.showCodeDesc : translations.en.showCodeDesc}
								</Tooltip>
							</div>
						{:else}
							<div class="flex justify-center">
								<p class="text-center text-5xl font-bold text-orange-600">{code}</p>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		{#if $session?.status === 'ended'}
			<div class="col-span-4 rounded-lg border p-6">
				<h2 class="mb-4 text-xl font-semibold">
					{$language === 'zh' ? translations.zh.finalSummary : translations.en.finalSummary}
				</h2>
				<div class="flex w-full flex-col gap-4">
					<div class="h-96">
						<WordCloud words={keywordData} />
					</div>
					<div class="flex w-full gap-4">
						<div class="h-96 flex-1">
							<MostActiveParticipants conversations={conversationsData} />
						</div>
						<div class="h-96 flex-1">
							<MostActiveGroups groups={$groups} />
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
				<Alert
					>{$language === 'zh'
						? translations.zh.waitingForParticipants
						: translations.en.waitingForParticipants}</Alert
				>
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
								<Tooltip
									>{$language === 'zh'
										? translations.zh.openGroupChatHistory
										: translations.en.openGroupChatHistory}</Tooltip
								>
								<GroupStatus {group} showStatus={$session?.status === 'group'} />
							</div>
							{#if group.participants.length === 0}
								<p class="text-xs text-gray-500">
									{$language === 'zh'
										? translations.zh.noParticipants
										: translations.en.noParticipants}
								</p>
							{:else}
								<ul class="space-y-1.5">
									{#each group.participants as participant}
										<li>
											<div class="flex items-center gap-1.5">
												<div class="flex flex-1 items-center gap-1.5">
													<span
														class="min-w-[60px] max-w-[60px] cursor-pointer truncate text-xs hover:text-primary-600"
														onclick={() => handleParticipantClick(group.id, participant)}
														onkeydown={(e) =>
															e.key === 'Enter' && handleParticipantClick(group.id, participant)}
														role="button"
														tabindex="0"
													>
														<ResolveUsername id={participant} />
													</span>
													<Tooltip
														>{$language === 'zh'
															? translations.zh.openChatHistory
															: translations.en.openChatHistory}</Tooltip
													>

													{#if participantProgress.has(participant)}
														<div class="flex flex-1 items-center gap-1.5">
															<div class="flex h-1.5 flex-1">
																{#each participantProgress.get(participant)?.completedTasks || [] as completed, i}
																	<div
																		class="h-full flex-1 border-r border-white first:rounded-l last:rounded-r last:border-r-0 {completed
																			? 'bg-green-500'
																			: 'bg-gray-300'}"
																	></div>
																	<Tooltip>{$session?.subtasks[i] || `Subtask ${i + 1}`}</Tooltip>
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
																	{#if warning.moderation}
																		<Tooltip
																			>{$language === 'zh'
																				? translations.zh.warningInappropriate
																				: translations.en.warningInappropriate}</Tooltip
																		>
																	{:else if warning.offTopic >= 3}
																		<Tooltip
																			>{$language === 'zh'
																				? translations.zh.warningOffTopic
																				: translations.en.warningOffTopic}</Tooltip
																		>
																	{/if}
																{/if}
															{/if}
														</div>
													{/if}
												</div>
												<button
													class="shrink-0 rounded p-0.5 text-gray-500 hover:bg-gray-100 hover:text-red-500"
													onclick={() => handleRemoveParticipant(group.id, participant)}
												>
													<X class="h-3 w-3" />
												</button>
												<Tooltip
													>{$language === 'zh'
														? translations.zh.removeParticipant
														: translations.en.removeParticipant}</Tooltip
												>
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
			<h2 class="mb-4 text-xl font-semibold">
				{$language === 'zh' ? translations.zh.mainTask : translations.en.mainTask}
			</h2>
			<p class="text-gray-700">{$session?.task}</p>

			{#if $session?.subtasks.length > 0}
				<div class="mt-4">
					<h3 class="mb-2 font-medium">
						{$language === 'zh' ? translations.zh.subtasks : translations.en.subtasks}
					</h3>
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
			<h2 class="mb-4 text-xl font-semibold">
				{$language === 'zh' ? translations.zh.resources : translations.en.resources}
			</h2>
			{#if $session?.resources.length === 0}
				<p class="text-gray-600">
					{$language === 'zh' ? translations.zh.noResources : translations.en.noResources}
				</p>
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
