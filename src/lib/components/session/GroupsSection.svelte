<script lang="ts">
	import { X, TriangleAlert, MessageSquareOff } from 'lucide-svelte';
	import type { Group } from '$lib/schema/group';
	import type { Class } from '$lib/schema/class';
	import type { Conversation } from '$lib/schema/conversation';
	import { Button, Tooltip, Select, Input, Alert } from 'flowbite-svelte';
	import { notifications } from '$lib/stores/notifications';
	import { page } from '$app/stores';
	import { UI_CLASSES } from '$lib/config/ui';
	import { collection, getDocs, getDoc, doc, Timestamp } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import GroupStatus from './GroupStatus.svelte';
	import ResolveUsername from '../ResolveUsername.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { getUser } from '$lib/utils/getUser';
	import { createEventDispatcher } from 'svelte';
	import { deploymentConfig } from '$lib/config/deployment';

	let {
		session,
		current_waitlist,
		allGroupParticipants,
		unGroupedParticipantsNum,
		groups,
		participantProgress,
		selectedGroups = new Set<string>(),
		showExportOptions = false
	} = $props();

	// Define types
	type GroupWithId = Group & {
		id: string;
		updatedAt: Timestamp | undefined;
	};

	// Define grouping modes
	type GroupingMode = 'auto' | 'manual' | 'class';
	let groupingMode = $state<GroupingMode>('auto');
	let classData = $state<Class | null>(null);
	let isLoadingClass = $state(false);
	let groupNumber = $state(1);
	let isApplyingGroups = $state(false);
	let settings = { groupingMode: 'auto' };

	// Define event dispatchers
	const dispatch = createEventDispatcher<{
		open: {
			show: boolean;
			group?: {
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
			participant?: {
				displayName: string;
				history: Array<{
					name: string;
					content: string;
					self?: boolean;
					audio?: string;
					avatar?: string;
				}>;
			} | null;
			conversation?: { data: Conversation; id: string } | null;
		};
		groupSelection: {
			groupId: string;
			selected: boolean;
		};
	}>();

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

	// Initialize grouping mode based on settings
	$effect(() => {
		settings = $session?.settings || { groupingMode: 'auto' };
		groupingMode = settings.groupingMode as GroupingMode;
	});

	// Load class data if session has a class ID
	async function loadClassData() {
		try {
			isLoadingClass = true;
			if (!$session.classId) {
				return;
			}

			const classRef = doc(db, 'classes', $session.classId);
			const classSnapshot = await getDoc(classRef);

			if (classSnapshot.exists()) {
				classData = classSnapshot.data() as Class;
			} else {
				notifications.warning('Class data not found');
			}
		} catch (error) {
			console.error('Error loading class data:', error);
			notifications.error('Failed to load class data');
		} finally {
			isLoadingClass = false;
		}
	}

	$effect(() => {
		if ($session?.classId) {
			loadClassData();
		}
	});

	async function handleApplyGroups() {
		if (!current_waitlist || isApplyingGroups) return;

		try {
			isLoadingClass = true;

			// Different logic based on grouping mode
			if (groupingMode === 'auto') {
				if (groupNumber < 1) return;

				isApplyingGroups = true;
				console.log('Now: ', current_waitlist);
				const filtered_waitlist = current_waitlist.filter(
					(item: string) => !allGroupParticipants.includes(item)
				);

				console.log('filter: ', filtered_waitlist);

				const groupSizeBig = Math.ceil(filtered_waitlist.length / groupNumber);
				const groupSizeSmall = Math.floor(filtered_waitlist.length / groupNumber);
				const Bignum = filtered_waitlist.length % groupNumber;
				let nums = 0;
				for (let i = 0; i < groupNumber; i++) {
					const groupSize = i < Bignum ? groupSizeBig : groupSizeSmall;
					const group = filtered_waitlist.slice(nums, nums + groupSize);
					nums += groupSize;
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
						notifications.error(data.error || '自動分組失敗');
						return;
					}
				}
			} else if (groupingMode === 'class' && classData) {
				// Apply class groups if available
				if (!classData.groups || classData.groups.length === 0) {
					notifications.warning('No class groups defined');
					return;
				}

				isApplyingGroups = true;
				const filtered_waitlist = current_waitlist.filter(
					(item: string) => !allGroupParticipants.includes(item)
				);

				// Create groups based on class groups
				for (const classGroup of classData.groups) {
					// Filter to only include students who are in the waitlist
					const groupStudents = classGroup.students.filter((student) =>
						filtered_waitlist.includes(student)
					);

					if (groupStudents.length === 0) continue;

					const response = await fetch(`/api/session/${$page.params.id}/group/auto_group`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							participants: groupStudents,
							group_number: classGroup.number
						})
					});

					if (!response.ok) {
						const data = await response.json();
						notifications.error(data.error || 'Class group assignment failed');
						return;
					}
				}

				notifications.success('成功分組');
			}
		} catch (error) {
			console.error('Error applying groups:', error);
			notifications.error('分組失敗');
		} finally {
			isApplyingGroups = false;
			isLoadingClass = false;
		}
	}

	async function updateSettings() {
		try {
			settings.groupingMode = groupingMode;
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
				notifications.success('設定更新成功', 3000);
			}
		} catch (error) {
			console.error('Error updating settings:', error);
			notifications.error('Failed to update settings');
		}
	}

	async function handleGroupingModeChange(event: Event) {
		const newValue = (event.target as HTMLSelectElement).value as GroupingMode;
		try {
			groupingMode = newValue;
			await updateSettings();
		} catch (error) {
			console.error('Error updating grouping mode setting:', error);
			notifications.error('Failed to update grouping mode setting');
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
						name: message.role === 'user' ? userData.displayName : deploymentConfig.siteTitle,
						content: message.content,
						self: message.role === 'user',
						audio: message.audio || undefined
					}))
				};
				dispatch('open', {
					show: true,
					participant: selectedParticipant,
					conversation: conversation
				});
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
			dispatch('open', {
				show: true,
				group: selectedGroup
			});
		} catch (error) {
			console.error('無法載入小組討論:', error);
			notifications.error('無法載入小組討論');
		}
	}
</script>

<!-- Groups Section -->
<div class="mb-4">
	<!-- Group Header with Status -->
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-2">
			<h2 class="text-xl font-semibold">{m.Groups()}</h2>
			{#if unGroupedParticipantsNum > 0}
				<span class="rounded-full bg-orange-100 px-2 py-0.5 text-sm text-orange-600">
					{m.unGrouped()}: {unGroupedParticipantsNum}
				</span>
			{:else}
				<span class="rounded-full bg-green-100 px-2 py-0.5 text-sm text-green-600">
					{m.allGrouped()}
				</span>
			{/if}
		</div>
		{#if $session?.status === 'preparing'}
			<div class="flex items-center gap-4">
				<div class="flex items-center gap-2">
					<Select bind:value={groupingMode} on:change={handleGroupingModeChange} class="w-auto">
						<option value="auto">{m.autoGrouping()}</option>
						<option value="manual">{m.manualGrouping()}</option>
						{#if $session?.classId}
							<option value="class">{m.classGrouping()}</option>
						{/if}
					</Select>
					<Tooltip placement="right">
						{#if groupingMode === 'auto'}
							{m.autoGroupingDesc()}
						{:else if groupingMode === 'manual'}
							{m.manualGroupingDesc()}
						{:else if groupingMode === 'class'}
							{m.classGroupingDesc()}
						{/if}
					</Tooltip>
				</div>
				{#if groupingMode === 'auto'}
					<div class="flex items-center gap-2">
						<Input type="number" min="1" max="50" class="w-20" bind:value={groupNumber} />
						<span class="text-sm text-gray-500">{m.autoGroupingUnit()}</span>
					</div>
				{/if}
				{#if groupingMode !== 'manual'}
					<Button
						color="primary"
						size="sm"
						on:click={handleApplyGroups}
						disabled={isApplyingGroups || isLoadingClass}
					>
						{isApplyingGroups ? m.applyingAutoGroup() : m.groupModeApplied()}
					</Button>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Group Display -->
	{#if $groups.length === 0}
		<Alert>{m.waitingForParticipants()}</Alert>
	{:else}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each $groups.sort((a: GroupWithId, b: GroupWithId) => a.number - b.number) as group}
				<div class="rounded border p-3 {UI_CLASSES.PANEL_BG} shadow-sm">
					<div class="mb-2 flex items-center justify-between">
						<div class="flex items-center gap-2">
							{#if $session?.status === 'ended' && showExportOptions}
								<input
									type="checkbox"
									class="rounded border-gray-300"
									checked={selectedGroups.has(group.id)}
									onchange={(e) => {
										dispatch('groupSelection', {
											groupId: group.id,
											selected: e.currentTarget.checked
										});
									}}
								/>
							{/if}
							<button
								class="cursor-pointer text-sm font-semibold hover:text-primary-600"
								onclick={() => handleGroupClick(group)}
								onkeydown={(e) => e.key === 'Enter' && handleGroupClick(group)}
							>
								{m.groupVocabulary()} #{group.number}
							</button>
							{#if $session?.status !== 'ended'}
								<Tooltip>{m.openGroupChatHistory()}</Tooltip>
							{/if}
						</div>
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
												{#key participant}
													<ResolveUsername id={participant} />
												{/key}
											</span>
											{#if $session?.status !== 'ended'}
												<Tooltip>{m.openChatHistory()}</Tooltip>
											{/if}

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
																		<TriangleAlert class="h-3 w-3 text-white hover:text-gray-200" />
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
