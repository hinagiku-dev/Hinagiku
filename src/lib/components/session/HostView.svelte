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
	import * as m from '$lib/paraglide/messages.js';
	import { Toggle, Input } from 'flowbite-svelte';

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
	let groupNumber = $state(1);
	let autoGroup = $state(true);
	let settings = $state<Session['settings']>({ autoGroup: true });

	async function handleApplyGroups() {
		if (!$session?.waitlist || !autoGroup || groupNumber < 1) return;
		let waitlist = $session.waitlist;
		const groupSizeBig = Math.ceil(waitlist.length / groupNumber);
		const groupSizeSmall = Math.floor(waitlist.length / groupNumber);
		const Bignum = waitlist.length % groupNumber;
		let nums = 0;
		for (let i = 0; i < groupNumber; i++) {
			const groupSize = i < Bignum ? groupSizeBig : groupSizeSmall;
			const group = waitlist.slice(nums, nums + groupSize);
			nums += groupSize;
			console.log('Group:', group);
			if (group.length <= 0) break;
			const response = await fetch(`/api/session/${$page.params.id}/group/auto_group`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(group)
			});
			if (!response.ok) {
				const data = await response.json();
				notifications.error(data.error || 'Auto group failed');
				return;
			}
		}
		waitlist = [];
	}

	async function updateSettings() {
		try {
			settings.autoGroup = autoGroup;
			const response = await fetch(`/api/session/${$page.params.id}/settings`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(settings)
			});

			if (!response.ok) {
				throw new Error('Failed to update settings');
			} else {
				notifications.success('Settings updated', 3000);
			}
		} catch (error) {
			console.error('Error updating settings:', error);
			notifications.error('Failed to update settings');
		}
	}

	async function handleAutoGroupToggle(event: Event) {
		const newValue = (event.target as HTMLInputElement).checked;
		try {
			await updateSettings();
			autoGroup = newValue;
		} catch (error) {
			console.error('Error updating auto group setting:', error);
			notifications.error('Failed to update auto group setting');
			// Revert the toggle if update fails
			autoGroup = !newValue;
		}
	}

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
				console.error('無法載入群組資料:', error);
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
			console.error('無法載入對話歷史:', error);
			notifications.error('無法載入對話歷史');
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
			console.error('無法載入群組討論:', error);
			notifications.error('無法載入群組討論');
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
		} catch (error) {
			console.error('無法載入對話資料:', error);
			notifications.error('無法載入對話資料');
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
			console.error('無法載入關鍵字資料:', error);
			notifications.error('無法載入關鍵字資料');
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
					{m.joinSessionHost()}
				</h2>
				<p class="text-gray-700">
					{m.joinSessionDescHost()}
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
									{m.showCode()}
								</Button>
								<Tooltip placement="bottom">
									{m.showCodeDesc()}
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
					{m.finalSummary()}
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
			<!-- Replace the waitlist participants section with this -->
			<div class="mb-6 border-b pb-4">
				<h3 class="mb-3 text-lg font-semibold">Waitlist Participants</h3>
				<div class="flex flex-wrap gap-2">
					{#if $session?.waitlist && $session.waitlist.length > 0}
						{#each $session.waitlist as participantId}
							<div class="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1">
								<span class="h-2 w-2 rounded-full bg-green-500"></span>
								<span class="text-sm">
									<ResolveUsername id={participantId} />
								</span>
							</div>
						{/each}
					{:else}
						<p class="text-sm text-gray-500">No participants in waitlist</p>
					{/if}
				</div>
			</div>

			<!-- Existing Groups Section -->
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-xl font-semibold">{m.Groups()}</h2>
				{#if $session?.status === 'preparing'}
					<div class="flex items-center gap-4">
						<div class="flex items-center gap-2">
							<Toggle bind:checked={autoGroup} on:change={handleAutoGroupToggle}>
								{autoGroup ? m.autoGrouping() : m.manualGrouping()}
							</Toggle>
							<Tooltip placement="right">
								{autoGroup ? m.autoGroupingDesc() : m.manualGroupingDesc()}
							</Tooltip>
						</div>
						{#if autoGroup}
							<div class="flex items-center gap-2">
								<Input type="number" min="1" max="50" class="w-20" bind:value={groupNumber} />
								<span class="text-sm text-gray-500">{m.autoGroupingUnit()}</span>
							</div>
						{/if}
						{#if autoGroup}
							<Button color="primary" size="sm" on:click={handleApplyGroups}>
								{m.groupModeApplied()}
							</Button>
						{/if}
					</div>
				{/if}
			</div>
			{#if $groups.length === 0}
				<Alert>{m.waitingForParticipants()}</Alert>
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
								<Tooltip>{m.openGroupChatHistory()}</Tooltip>
								<GroupStatus {group} showStatus={$session?.status === 'group'} />
							</div>
							{#if group.participants.length === 0}
								<p class="text-xs text-gray-500">
									{m.noParticipants()}
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
													<Tooltip>{m.openChatHistory()}</Tooltip>

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
																		<Tooltip>{m.warningInappropriate()}</Tooltip>
																	{:else if warning.offTopic >= 3}
																		<Tooltip>{m.warningOffTopic()}</Tooltip>
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
												<Tooltip>{m.removeParticipant()}</Tooltip>
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
				{m.mainTask()}
			</h2>
			<p class="text-gray-700">{$session?.task}</p>

			{#if $session?.subtasks.length > 0}
				<div class="mt-4">
					<h3 class="mb-2 font-medium">
						{m.subtasks()}
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
				{m.resources()}
			</h2>
			{#if $session?.resources.length === 0}
				<p class="text-gray-600">
					{m.noResources()}
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
