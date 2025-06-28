<script lang="ts">
	import { MessageSquarePlus } from 'lucide-svelte';
	import type { Session } from '$lib/schema/session';
	import type { Readable } from 'svelte/store';
	import QRCode from '$lib/components/QRCode.svelte';
	import { Button, Tooltip, Modal, Spinner } from 'flowbite-svelte';
	import { notifications } from '$lib/stores/notifications';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
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
		doc,
		getDoc
	} from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import { writable } from 'svelte/store';
	import { getUser } from '$lib/utils/getUser';
	import type { Conversation } from '$lib/schema/conversation';
	import { SvelteMap } from 'svelte/reactivity';
	import { renderMarkdown } from '$lib/utils/renderMarkdown';
	import ChatHistory from './ChatHistory.svelte';
	import GroupChatHistory from './GroupChatHistory.svelte';
	import GroupsSection from './GroupsSection.svelte';
	import StageProgress from './StageProgress.svelte';
	import WordCloud from './WordCloud.svelte';
	import MostActiveParticipants from './MostActiveParticipants.svelte';
	import MostActiveGroups from './MostActiveGroups.svelte';
	import LabelManager from './LabelManager.svelte';
	import ResolveUsername from '../ResolveUsername.svelte';
	import TranscriptExporter from './TranscriptExporter.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { Input, Toggle, Textarea } from 'flowbite-svelte';
	import { announcement } from '$lib/stores/announcement';
	import { UI_CLASSES } from '$lib/config/ui';

	let { session }: { session: Readable<Session> } = $props();
	let code = $state('');
	let showExportOptions = $state(false);
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
	let conversationsMap = $state(new SvelteMap<string, Conversation>());
	let groupsMap = $state(new SvelteMap<string, GroupWithId>());
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

	let selectedParticipants = $state<Set<string>>(new Set());
	let selectedGroups = $state<Set<string>>(new Set());

	let current_waitlist: string[] = $state([]);
	session.subscribe((value) => {
		current_waitlist = value.waitlist;
	});
	let allGroupParticipants: string[] = $state([]);
	groups.subscribe((value) => {
		allGroupParticipants = value.flatMap((group) => group.participants);
	});
	let unGroupedParticipantsNum = $derived(current_waitlist.length - allGroupParticipants.length);

	let className = $state<string | null>(null);

	$effect(() => {
		let cancelled = false;

		async function fetchClassName() {
			if ($session?.classId && !cancelled) {
				try {
					const classDoc = await getDoc(doc(db, 'classes', $session?.classId));
					if (classDoc.exists() && !cancelled) {
						className = classDoc.data().className;
					} else {
						className = null;
					}
				} catch (error) {
					if (!cancelled) {
						console.error('Error fetching class name:', error);
						className = null;
					}
				}
			} else {
				className = null;
			}
		}

		fetchClassName();

		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		$inspect(current_waitlist, 'current_waitlist');
		$inspect(allGroupParticipants, 'allGroupParticipants');
		$inspect(unGroupedParticipantsNum, 'unGroupedParticipantsNum');
	});

	let announcementMessage = $state('');
	let isBroadcasting = $state(false);

	let reflectionQuestion = $state('');
	let isSavingReflectionQuestion = $state(false);

	$effect(() => {
		if ($session) {
			reflectionQuestion = $session.reflectionQuestion || '';
		}
	});

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

					groupsData.forEach((group) => {
						groupsMap.set(group.id, group);
					});

					console.log($groups);

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

									conversationsMap.set(conv.userId, conv);
								}
							});
							unsubscribes.push(unsubscribe);
						}
					});
				});
				unsubscribes.push(unsubscribe);
			} catch (error) {
				console.error('無法載入小組資料:', error);
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
			notifications.error(data.error || m.codeGenerationFailed());
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
				notifications.error(data.error || m.conversationCreationFailed());
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
				notifications.error(data.error || m.personalStageStartFailed());
				return;
			}

			notifications.success(m.personalStageStarted(), 3000);
		} catch (error) {
			console.error('無法開始個人階段:', error);
			notifications.error(m.personalStageStartFailed());
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

	async function handleEndAfterGroup() {
		const response = await fetch(`/api/session/${$page.params.id}/action/end-after-group`, {
			method: 'POST'
		});

		if (!response.ok) {
			const data = await response.json();
			console.error('Failed to end after-group stage:', data.error);
		}
	}

	async function handlePreparing() {
		await fetch(`/api/session/${$page.params.id}/action/preparing`, {
			method: 'POST'
		});
	}

	const stageButton = $derived({
		preparing: {
			text: m.startIndividualStage(),
			action: handleStartSession,
			show: true
		},
		individual: {
			text: m.endIndividualStage(),
			action: handleEndIndividual,
			show: true
		},
		'before-group': {
			text: m.startGroupStage(),
			action: handleStartGroup,
			show: true
		},
		group: {
			text: m.endGroupStage(),
			action: handleEndGroup,
			show: true
		},
		'after-group': {
			text: m.endAfterGroupStage(),
			action: handleEndAfterGroup,
			show: true
		},
		ended: {
			text: m.sessionEnded(),
			action: () => {
				notifications.error(m.alreadyEnded(), 3000);
			},
			show: false
		}
	});

	async function handleStageChange(newStage: string) {
		const actions = {
			preparing: handlePreparing,
			individual: handleStartSession,
			'before-group': handleEndIndividual,
			group: handleStartGroup,
			'after-group': handleEndGroup,
			ended: handleEndAfterGroup
		};

		try {
			// Add confirmation check for ungrouped participants
			if (unGroupedParticipantsNum > 0 && newStage !== 'preparing') {
				const confirmed = window.confirm(
					`${m.SomeoneUngroupednotification1()} ${unGroupedParticipantsNum} ${m.SomeoneUngroupednotification2()}`
				);
				if (!confirmed) {
					return;
				}
			}

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
			notifications.error(m.conversationLoadFailed());
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
			notifications.error(m.keywordsLoadFailed());
		}
	}

	$effect(() => {
		if ($session?.status === 'ended') {
			loadConversationsData();
			loadKeywordData();
			if (!$session.summary && !isSummarizing) {
				generateSummary();
			}
		}
	});

	let isSummarizing = $state(false);

	async function generateSummary() {
		if (isSummarizing) {
			return;
		}
		isSummarizing = true;
		try {
			const response = await fetch(`/api/session/summarize`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sessionId: $page.params.id })
			});
			if (!response.ok) {
				const data = await response.json();
				notifications.error(data.error || 'Failed to generate summary.');
			}
			// The summary will be updated in the session store automatically via snapshot listener.
		} catch (error) {
			console.error('Error generating summary:', error);
			notifications.error('Failed to generate summary.');
		} finally {
			isSummarizing = false;
		}
	}

	$effect(() => {
		if ($session?.status === 'ended') {
			if (!$session.summary) {
				generateSummary();
			}
		}
	});

	async function broadcastAnnouncement() {
		if (!announcementMessage.trim()) {
			notifications.warning(m.announcementEmpty());
			return;
		}

		try {
			isBroadcasting = true;
			const response = await fetch(`/api/session/${$page.params.id}/announcement`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					message: announcementMessage,
					active: true
				})
			});

			if (response.ok) {
				// Local announcement for the host (shown immediately)
				notifications.success(m.announcementBroadcasted());
			} else {
				const data = await response.json();
				notifications.error(data.error || m.announcementFailed());
			}
		} catch (error) {
			console.error('Error broadcasting announcement:', error);
			notifications.error(m.announcementFailed());
		} finally {
			isBroadcasting = false;
		}
	}

	async function cancelAnnouncement() {
		try {
			const response = await fetch(`/api/session/${$page.params.id}/announcement`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					message: '',
					active: false
				})
			});

			if (response.ok) {
				// Cancel local announcement for the host
				announcement.cancel();
				// Clear the announcement input field
				announcementMessage = '';
				notifications.success(m.announcementCancelled());
			} else {
				const data = await response.json();
				notifications.error(data.error || m.announcementCancelFailed());
			}
		} catch (error) {
			console.error('Error cancelling announcement:', error);
			notifications.error(m.announcementCancelFailed());
		}
	}

	function handleSelectionChange(participants: Set<string>, groups: Set<string>) {
		selectedParticipants = participants;
		selectedGroups = groups;
	}

	let showDeleteModal = writable(false);

	async function handleDeleteModal() {
		$showDeleteModal = !$showDeleteModal;
	}

	async function confirmDeleteDiscussion() {
		try {
			const response = await fetch(`/api/session/${$page.params.id}/action/delete`, {
				method: 'POST'
			});
			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || m.deleteClassFailed());
			}
			notifications.success(m.deleteClassSuccess());
			$showDeleteModal = false;
			goto('/dashboard');
		} catch (error) {
			console.error('Failed to delete session:', error);
			notifications.error(m.failedDelete());
		}
	}

	async function saveReflectionQuestion() {
		isSavingReflectionQuestion = true;
		try {
			const response = await fetch(`/api/session/${$page.params.id}/settings`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ reflectionQuestion })
			});
			if (response.ok) {
				notifications.success(m.reflectionQuestionUpdated());
			} else {
				notifications.error(m.failedToUpdateReflectionQuestion());
			}
		} catch (error) {
			console.error('Failed to save reflection question', error);
			notifications.error('Failed to update reflection question');
		} finally {
			isSavingReflectionQuestion = false;
		}
	}
</script>

<main class="mx-auto max-w-7xl px-4 py-16">
	<div class="mb-8 space-y-6">
		<!-- Labels and Title Section -->

		<div class="rounded-lg border p-6 {UI_CLASSES.PANEL_BG}">
			<div class="mb-4 flex items-center justify-between">
				<LabelManager sessionId={$page.params.id} labels={$session?.labels || []} />
				<Button color="alternative" onclick={() => handleDeleteModal()}>
					{m.deleteSession()}
				</Button>
			</div>
			<div class="mt-4 flex items-center justify-between">
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

		<!-- Announcement Section - Only visible during active sessions -->
		{#if $session?.status !== 'preparing' && $session?.status !== 'ended'}
			<div class="rounded-lg border p-4 {UI_CLASSES.PANEL_BG}">
				<h3 class="mb-2 text-lg font-medium">{m.announcements()}</h3>
				<div class="flex flex-wrap items-center gap-2">
					<Input
						type="text"
						placeholder={m.enterAnnouncement()}
						class="flex-1 text-sm"
						bind:value={announcementMessage}
					/>
					<Button
						color="primary"
						class="flex items-center gap-2 whitespace-nowrap"
						on:click={broadcastAnnouncement}
						disabled={isBroadcasting || !announcementMessage.trim()}
					>
						<MessageSquarePlus class="h-4 w-4" />
						{m.broadcast()}
					</Button>
					<Button
						color="red"
						class="whitespace-nowrap"
						on:click={cancelAnnouncement}
						disabled={!$session?.announcement?.active}
					>
						{m.cancelBroadcast()}
					</Button>
				</div>
			</div>
		{/if}
	</div>

	<div class="grid gap-8 md:grid-cols-4">
		{#if $session?.status && $session.status === 'preparing'}
			<div class="rounded-lg border p-6 {UI_CLASSES.PANEL_BG}">
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
			<div class="col-span-4 space-y-8">
				<div class="rounded-lg border p-6 {UI_CLASSES.PANEL_BG}">
					<h2 class="mb-4 text-xl font-semibold">{m.finalSummary()}</h2>

					<div class="mb-6 rounded-lg border bg-gray-50/80 p-4 dark:bg-gray-800">
						<div class="flex items-center justify-between">
							<h3 class="text-lg font-medium">{m.sessionSummary()}</h3>
							<Button size="xs" on:click={generateSummary} disabled={isSummarizing}>
								{#if isSummarizing}
									<Spinner class="mr-2" size="4" />
								{/if}
								{m.regenerate()}
							</Button>
						</div>
						<div class="mt-2">
							{#if isSummarizing}
								<div class="flex items-center justify-center py-4">
									<p>{m.generatingSummary()}</p>
								</div>
							{:else if $session.summary && typeof $session.summary === 'object'}
								<div class="prose prose-hina max-w-none space-y-4 dark:prose-invert">
									<div>
										<h4 class="font-semibold">{m.integratedViewpoint()}</h4>
										<p>{$session.summary.integratedViewpoint}</p>
									</div>
									<div>
										<h4 class="font-semibold">{m.differences()}</h4>
										<p>{$session.summary.differences}</p>
									</div>
									<div>
										<h4 class="font-semibold">{m.learningProgress()}</h4>
										<p>{$session.summary.learningProgress}</p>
									</div>
									<div>
										<h4 class="font-semibold">{m.finalConclusion()}</h4>
										<p>{$session.summary.finalConclusion}</p>
									</div>
								</div>
							{:else if $session.summary}
								{#if typeof $session.summary === 'string'}
									<p class="prose prose-hina max-w-none dark:prose-invert">{$session.summary}</p>
								{:else if typeof $session.summary === 'object' && $session.summary}
									<div class="prose prose-hina max-w-none dark:prose-invert">
										<h4 class="font-semibold">{m.integratedViewpoint()}</h4>
										<p>{$session.summary.integratedViewpoint}</p>
										<h4 class="mt-4 font-semibold">{m.differences()}</h4>
										<p>{$session.summary.differences}</p>
										<h4 class="mt-4 font-semibold">{m.learningProgress()}</h4>
										<p>{$session.summary.learningProgress}</p>
										<h4 class="mt-4 font-semibold">{m.finalConclusion()}</h4>
										<p>{$session.summary.finalConclusion}</p>
									</div>
								{/if}
							{:else}
								<div class="flex flex-col items-center justify-center py-4">
									<p>{m.noSummaryAvailable()}</p>
								</div>
							{/if}
						</div>
					</div>

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
			</div>
		{/if}

		<div
			class="col-span-3 rounded-lg border p-6 {UI_CLASSES.PANEL_BG} {$session?.status !==
			'preparing'
				? 'md:col-span-4'
				: ''}"
		>
			<!-- Current Participants Section -->
			<div class="mb-6 border-b pb-4">
				<div class="flex items-center justify-between">
					<h3 class="mb-3 text-lg font-semibold">
						{m.currentParticipants()} ({current_waitlist?.length || 0})
					</h3>
					<div class="flex items-center gap-3">
						{#if className}
							<span class="text-sm text-gray-500">{m.Class()} : {className}</span>
						{/if}
					</div>
				</div>
				<div class="flex flex-wrap gap-2">
					{#if current_waitlist && current_waitlist.length > 0}
						{#each current_waitlist as participantId}
							<div class="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1">
								{#if $session?.status === 'ended' && showExportOptions}
									<input
										type="checkbox"
										class="rounded border-gray-300"
										checked={selectedParticipants.has(participantId)}
										onchange={(e) => {
											if (e.currentTarget.checked) {
												selectedParticipants = new Set([...selectedParticipants, participantId]);
											} else {
												const newSet = new Set(selectedParticipants);
												newSet.delete(participantId);
												selectedParticipants = newSet;
											}
										}}
									/>
								{/if}
								<span class="h-2 w-2 rounded-full bg-green-500"></span>
								<span class="text-sm">
									{#key participantId}
										<ResolveUsername id={participantId} />
									{/key}
								</span>
							</div>
						{/each}
					{:else}
						<p class="text-sm text-gray-500">{m.noParticipantsInWaitlist()}</p>
					{/if}
				</div>
			</div>

			<!-- Groups Section -->
			<GroupsSection
				{session}
				{current_waitlist}
				{allGroupParticipants}
				{unGroupedParticipantsNum}
				{groups}
				{participantProgress}
				{selectedGroups}
				{showExportOptions}
				on:open={(event) => {
					if (event.detail.group) {
						selectedGroup = event.detail.group;
						showGroupChatHistory = true;
					} else if (event.detail.participant && event.detail.conversation) {
						selectedParticipant = event.detail.participant;
						selectedConversation = event.detail.conversation;
						showChatHistory = true;
					}
				}}
				on:groupSelection={(event) => {
					if (event.detail.selected) {
						selectedGroups = new Set([...selectedGroups, event.detail.groupId]);
					} else {
						const newSet = new Set(selectedGroups);
						newSet.delete(event.detail.groupId);
						selectedGroups = newSet;
					}
				}}
			/>

			<!-- Export Options Section -->
			{#if $session?.status === 'ended'}
				<div class="mt-6 space-y-3">
					<!-- Export Toggle -->
					<div class="flex items-center gap-2">
						<Toggle bind:checked={showExportOptions} size="small" />
						<span class="text-sm font-medium text-gray-700">
							{showExportOptions ? m.hideExportOptions() : m.showExportOptions()}
						</span>
					</div>

					<!-- Export Options (conditionally shown) -->
					{#if showExportOptions}
						<TranscriptExporter
							session={$session}
							{selectedParticipants}
							{selectedGroups}
							{conversationsMap}
							{groupsMap}
							{participantProgress}
							onSelectionChange={handleSelectionChange}
						/>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Task Section -->
		<div class="col-span-4 mt-8 rounded-lg border p-6 {UI_CLASSES.PANEL_BG} shadow">
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
		<div class="col-span-4 mt-6 rounded-lg border p-6 {UI_CLASSES.PANEL_BG} shadow">
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
						<div class="rounded-lg border bg-gray-50/80 p-4">
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

		<!-- Reflection Question Section for Host -->
		<div class="col-span-4 mt-6 rounded-lg border p-6 {UI_CLASSES.PANEL_BG} shadow">
			<h2 class="mb-4 text-xl font-semibold">{m.reflectionQuestion()}</h2>
			<Textarea
				bind:value={reflectionQuestion}
				placeholder={m.reflectionQuestionPlaceholder()}
				rows={4}
				class="w-full"
			/>
			<Button class="mt-4" on:click={saveReflectionQuestion} disabled={isSavingReflectionQuestion}>
				{isSavingReflectionQuestion ? m.saving() : m.saveQuestion()}
			</Button>
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

<Modal bind:open={$showDeleteModal} size="xs" autoclose>
	<div class="text-center">
		<h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
			{m.deleteBatchSessionConfirmation()}
		</h3>
		<div class="flex justify-center gap-4">
			<Button color="red" on:click={confirmDeleteDiscussion}>{m.deleteSession()}</Button>
			<Button color="alternative" on:click={() => ($showDeleteModal = false)}>{m.noCancel()}</Button
			>
		</div>
	</div>
</Modal>
