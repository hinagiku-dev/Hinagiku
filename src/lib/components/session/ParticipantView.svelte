<script lang="ts">
	import { user as authUser } from '$lib/stores/auth';
	import type { Session } from '$lib/schema/session';
	import type { Group } from '$lib/schema/group';
	import type { Conversation } from '$lib/schema/conversation';
	import type { Profile } from '$lib/schema/profile';
	import type { Readable } from 'svelte/store';
	import { Button, Input, Label } from 'flowbite-svelte';
	import { notifications } from '$lib/stores/notifications';
	import { page } from '$app/stores';
	import { UserPlus, User, Users, CircleCheck, LogOut } from 'lucide-svelte';
	import { db } from '$lib/firebase';
	import { collection, query, where, onSnapshot } from 'firebase/firestore';
	import { onDestroy, onMount } from 'svelte';
	import { getUser } from '$lib/utils/getUser';
	import Chatroom from '$lib/components/Chatroom.svelte';
	import { MicVAD } from '@ricky0123/vad-web';
	import Summary from '$lib/components/session/Summary.svelte';
	import GroupSummary from '$lib/components/session/GroupSummary.svelte';
	import { initFFmpeg, float32ArrayToWav, wav2mp3 } from '$lib/utils/wav2mp3';
	import EndedView from '$lib/components/session/EndedView.svelte';

	interface ChatroomConversation {
		name: string;
		content: string;
		self?: boolean;
		audio?: string;
		avatar?: string;
	}

	let { session, user } = $props<{
		session: Readable<Session>;
		// eslint-disable-next-line no-undef
		user: App.Locals['user'];
	}>();

	let groupDoc = $state<{ data: Group; id: string } | null>(null);
	let groupStatus = $derived.by(() => groupDoc?.data.status || 'discussion');
	let conversationDoc = $state<{ data: Conversation; id: string } | null>(null);
	let conversationDocUnsubscribe: (() => void) | null = null;
	onDestroy(() => conversationDocUnsubscribe?.());

	let loadingGroupSummary = $state(false);

	let pInitFFmpeg: Promise<void> | null = null;
	let selfUser: Promise<Profile> | null = null;

	let isCreatingGroup = $state(false);

	onMount(() => {
		const groupsRef = collection(db, 'sessions', $page.params.id, 'groups');
		const groupDocQuery = query(groupsRef, where('participants', 'array-contains', user.uid));
		selfUser = getUser(user.uid);
		const unsbscribe = onSnapshot(groupDocQuery, (snapshot) => {
			if (snapshot.empty) {
				groupDoc = null;
				return;
			}
			groupDoc = {
				data: snapshot.docs[0].data() as Group,
				id: snapshot.docs[0].id
			};

			updateConversationDoc();
		});

		pInitFFmpeg = initFFmpeg();

		return unsbscribe;
	});

	$effect(() => {
		if ($session?.status === 'before-group' && conversationDoc && !conversationDoc.data.summary) {
			fetchSummary();
		}
		if ($session?.status === 'ended' && groupDoc && !groupDoc.data.summary) {
			fetchGroupSummary();
		}
	});

	function updateConversationDoc() {
		if (!groupDoc) {
			conversationDoc = null;
			conversationDocUnsubscribe?.();
			conversationDocUnsubscribe = null;
			return;
		}
		if (conversationDocUnsubscribe) {
			return;
		}

		console.log('Updating conversation doc...');
		const conversationsRef = collection(
			db,
			`sessions/${$page.params.id}/groups/${groupDoc.id}/conversations`
		);
		const conversationDocQuery = query(conversationsRef, where('userId', '==', user.uid));

		conversationDocUnsubscribe = onSnapshot(conversationDocQuery, (snapshot) => {
			if (snapshot.empty) {
				return;
			}
			conversationDoc = {
				data: snapshot.docs[0].data() as Conversation,
				id: snapshot.docs[0].id
			};
		});
	}

	let groupNumber = $state('');
	let creating = $state(false);
	let conversations = $derived.by<ChatroomConversation[]>(() => {
		if (!conversationDoc) {
			return [];
		}
		return conversationDoc.data.history.map((message) => ({
			name: message.role === 'user' ? 'You' : 'AI Assistant',
			self: message.role === 'user',
			content: message.content,
			audio: message.audio || undefined
		}));
	});

	async function handleCreateGroup() {
		if (isCreatingGroup) return;
		isCreatingGroup = true;

		try {
			const response = await fetch(`/api/session/${$page.params.id}/group`, {
				method: 'POST'
			});

			if (!response.ok) {
				const data = await response.json();
				notifications.error(data.error || 'Failed to create group');
				return;
			}

			notifications.success('Group created successfully');
			creating = false;
		} catch (error) {
			console.error('Error creating group:', error);
			notifications.error('Failed to create group');
		} finally {
			isCreatingGroup = false;
		}
	}

	async function handleJoinGroup() {
		if (!groupNumber || !/^(?:[1-9]|[1-4][0-9]|50)$/.test(groupNumber)) {
			notifications.error('Please enter a valid group number (1-50)');
			return;
		}

		try {
			const response = await fetch(`/api/session/${$page.params.id}/group/${groupNumber}/join`, {
				method: 'POST'
			});

			if (!response.ok) {
				const data = await response.json();
				notifications.error(data.error || 'Failed to join group');
				return;
			}

			notifications.success('Joined group successfully');
			creating = false;
		} catch (error) {
			console.error('Error joining group:', error);
			notifications.error('Failed to join group');
		}
	}

	async function sendAudioToSTT(file: File) {
		const formData = new FormData();
		formData.append('file', file);
		console.log('Sending audio to STT...', formData);

		try {
			const response = await fetch('/api/stt', {
				method: 'POST',
				body: formData
			});
			console.log('STT response:', response);
			if (!response.ok) {
				throw new Error('Failed to transcribe audio');
			}
			const data = await response.json();
			if (data.status === 'success') {
				return { transcription: data.transcription, url: data.url };
			}
			throw new Error(data.message || 'Failed to transcribe audio');
		} catch (error) {
			notifications.error('Failed to transcribe audio');
			console.error(error);
			return null;
		}
	}

	async function handleRecord() {
		if (!conversationDoc || !groupDoc) {
			notifications.error('No group or conversation found');
			return async () => {};
		}

		const vad = await MicVAD.new({
			model: 'v5',
			minSpeechFrames: 16, // 0.5s
			redemptionFrames: 32, // 1s
			onSpeechEnd: async (audio: Float32Array) => {
				if (!conversationDoc || !groupDoc) {
					notifications.error('No group or conversation found');
					return;
				}

				await pInitFFmpeg;
				console.log('Audio recorded:', audio);
				const wav = float32ArrayToWav(audio);
				console.log('Audio converted to wav:', wav);
				const mp3 = await wav2mp3(wav);
				console.log('Audio converted to mp3:', mp3);
				const result = await sendAudioToSTT(mp3);

				if (result) {
					try {
						const response = await fetch(
							`/api/session/${$page.params.id}/group/${groupDoc.id}/conversations/${conversationDoc.id}/chat`,
							{
								method: 'POST',
								headers: {
									'Content-Type': 'application/json'
								},
								body: JSON.stringify({
									content: result.transcription,
									audio: result.url
								})
							}
						);

						if (!response.ok) {
							throw new Error('Failed to send message');
						}
					} catch (error) {
						console.error('Error sending message:', error);
						notifications.error('Failed to send message');
					}
				}
			}
		});
		vad.start();

		return async () => {
			vad.pause();
			vad.destroy();
		};
	}

	async function handleSend(text: string) {
		if (!conversationDoc || !groupDoc) {
			notifications.error('No group or conversation found');
			return;
		}

		try {
			const response = await fetch(
				`/api/session/${$page.params.id}/group/${groupDoc.id}/conversations/${conversationDoc.id}/chat`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						content: text,
						audio: null
					})
				}
			);

			if (!response.ok) {
				throw new Error('Failed to send message');
			}
			notifications.success('Message sent!');
		} catch (error) {
			console.error('Error sending message:', error);
			notifications.error('Failed to send message');
		}
	}

	let loadingSummary = $state(false);

	async function fetchSummary() {
		if (!groupDoc || !conversationDoc) {
			notifications.error('無法獲取總結：找不到群組或對話');
			return;
		}

		loadingSummary = true;
		try {
			const response = await fetch(
				`/api/session/${$page.params.id}/group/${groupDoc.id}/conversations/${conversationDoc.id}/summary`
			);

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || '無法獲取總結');
			}

			notifications.success('成功獲取總結');
		} catch (error) {
			console.error('獲取總結時出錯:', error);
			notifications.error('無法獲取總結');
		} finally {
			loadingSummary = false;
		}
	}

	let groupDiscussions = $derived.by<ChatroomConversation[]>(() => {
		if (!groupDoc?.data.discussions) {
			return [];
		}
		return groupDoc.data.discussions.map((message) => ({
			name: message.speaker,
			self: message.id === user.uid,
			content: message.content,
			audio: message.audio || undefined
		}));
	});

	async function handleGroupSend(text: string) {
		if (!groupDoc) {
			notifications.error('找不到群組');
			return;
		}

		try {
			const response = await fetch(
				`/api/session/${$page.params.id}/group/${groupDoc.id}/discussions/add`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						content: text,
						speaker: (await selfUser)?.displayName || 'Unknown User',
						audio: null
					})
				}
			);

			if (!response.ok) {
				throw new Error('Failed to send message');
			}
			notifications.success('訊息已送出');
		} catch (error) {
			console.error('Error sending group message:', error);
			notifications.error('無法發送訊息');
		}
	}

	async function handleGroupRecord() {
		if (!groupDoc) {
			notifications.error('找不到群組');
			return async () => {};
		}

		const vad = await MicVAD.new({
			model: 'v5',
			minSpeechFrames: 16, // 0.5s
			redemptionFrames: 32, // 1s
			onSpeechEnd: async (audio: Float32Array) => {
				if (!groupDoc) {
					notifications.error('找不到群組');
					return;
				}

				await pInitFFmpeg;
				console.log('Audio recorded:', audio);
				const wav = float32ArrayToWav(audio);
				console.log('Audio converted to wav:', wav);
				const mp3 = await wav2mp3(wav);
				console.log('Audio converted to mp3:', mp3);
				const result = await sendAudioToSTT(mp3);

				if (result) {
					try {
						const response = await fetch(
							`/api/session/${$page.params.id}/group/${groupDoc.id}/discussions/add`,
							{
								method: 'POST',
								headers: {
									'Content-Type': 'application/json'
								},
								body: JSON.stringify({
									content: result.transcription,
									speaker: $authUser?.displayName || 'Unknown User',
									audio: result.url
								})
							}
						);

						if (!response.ok) {
							throw new Error('Failed to send message');
						}
					} catch (error) {
						console.error('Error sending group message:', error);
						notifications.error('無法發送訊息');
					}
				}
			}
		});
		vad.start();

		return async () => {
			vad.pause();
			vad.destroy();
		};
	}

	async function fetchGroupSummary() {
		if (!groupDoc) {
			notifications.error('找不到群組');
			return;
		}

		loadingGroupSummary = true;
		try {
			const response = await fetch(
				`/api/session/${$page.params.id}/group/${groupDoc.id}/discussions/summary`
			);

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || '無法獲取群組討論總結');
			}

			notifications.success('成功獲取群組討論總結');
		} catch (error) {
			console.error('獲取群組討論總結時出錯:', error);
			notifications.error('無法獲取群組討論總結');
		} finally {
			loadingGroupSummary = false;
		}
	}

	async function handleUpdateGroupSummary(summary: string, keywords: string[]) {
		if (!groupDoc) {
			notifications.error('找不到群組');
			return;
		}

		try {
			const response = await fetch(
				`/api/session/${$page.params.id}/group/${groupDoc.id}/discussions/summary`,
				{
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						updated_summary: summary,
						keywords: keywords
					})
				}
			);

			if (!response.ok) {
				throw new Error('更新失敗');
			}
			notifications.success('成功更新群組討論總結');
		} catch (error) {
			console.error('更新群組討論總結時出錯:', error);
			notifications.error('無法更新群組討論總結');
		}
	}

	async function handleEndGroup() {
		if (!groupDoc) {
			notifications.error('找不到群組');
			return;
		}

		try {
			await fetchGroupSummary();
			notifications.success('成功結束群組討論');
		} catch (error) {
			console.error('結束群組階段時出錯:', error);
			notifications.error('無法結束群組階段');
		}
	}

	async function handleEndSummarize() {
		if (!groupDoc) {
			notifications.error('找不到群組');
			return;
		}

		try {
			const response = await fetch(
				`/api/session/${$page.params.id}/group/${groupDoc.id}/discussions/end`,
				{
					method: 'POST'
				}
			);

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || '無法結束總結階段');
			}

			notifications.success('成功完成群組總結');
		} catch (error) {
			console.error('結束總結階段時出錯:', error);
			notifications.error('無法結束總結階段');
		}
	}

	async function handleLeaveGroup(groupId: string, participant: string) {
		try {
			const response = await fetch(
				`/api/session/${$page.params.id}/group/${groupId}/leave/${participant}`,
				{
					method: 'DELETE'
				}
			);

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to leave group');
			}

			notifications.success('Successfully left group');
			groupDoc = null;
			conversationDoc = null;
		} catch (error) {
			console.error('Error leaving group:', error);
			notifications.error('Failed to leave group');
		}
	}
</script>

<main class="mx-auto max-w-7xl px-2 py-8">
	<div class="flex items-center justify-between">
		<h1 class="mb-8 text-3xl font-bold">{$session?.title}</h1>
		{#if $session?.status === 'group' && groupDoc && groupDoc.data.participants[0] === user.uid}
			{#if groupStatus === 'discussion'}
				<Button color="green" on:click={handleEndGroup}>
					<CircleCheck class="mr-2 h-4 w-4" />
					Finish Group Discussion
				</Button>
			{:else if groupStatus === 'summarize'}
				<Button color="green" on:click={handleEndSummarize}>
					<CircleCheck class="mr-2 h-4 w-4" />
					Confirm Group Summary
				</Button>
			{/if}
		{/if}
	</div>

	<div class="grid gap-8 md:grid-cols-4">
		<div class="space-y-8 md:col-span-1">
			<!-- Status Section -->
			<div class="rounded-lg border p-6">
				<h2 class="mb-4 text-xl font-semibold">Session Status</h2>
				<div class="space-y-4">
					<div class="flex items-center gap-2">
						<!-- svelte-ignore element_invalid_self_closing_tag -->
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
						/>
						<span class="capitalize">{$session?.status}</span>
					</div>
					{#if $session?.status === 'individual'}
						<p class="text-gray-600">Work on your individual contributions.</p>
					{:else if $session?.status === 'before-group'}
						<p class="text-gray-600">Get ready to collaborate with your group.</p>
					{:else if $session?.status === 'group'}
						<p class="text-gray-600">Collaborate with your group members.</p>
					{/if}
				</div>
			</div>

			<!-- Group Section -->
			<div class="rounded-lg border p-6">
				<h2 class="mb-4 text-xl font-semibold">Group Information</h2>
				{#if groupDoc}
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<span class="font-medium">Group </span>
								<span class="text-lg">#{groupDoc.data.number}</span>
							</div>
							{#if $session?.status === 'preparing'}
								<Button
									color="red"
									size="xs"
									onclick={() => groupDoc?.id && handleLeaveGroup(groupDoc.id, user.uid)}
								>
									<LogOut class="mr-2 h-4 w-4" />
									Leave Group
								</Button>
							{/if}
						</div>
						<div>
							<h3 class="mb-2 font-medium">Members:</h3>
							<ul class="space-y-2">
								{#each groupDoc.data.participants as participant, index}
									<li class="flex items-center gap-2">
										<User class="h-4 w-4" />
										<span>
											{#if participant === user.uid}
												You{index === 0 ? ' (Leader)' : ''}
											{:else}
												{#await getUser(participant)}
													<span class="text-gray-500">載入中...</span>
												{:then profile}
													{profile.displayName}{index === 0 ? ' (Leader)' : ''}
												{:catch}
													<span class="text-red-500">未知使用者</span>
												{/await}
											{/if}
										</span>
									</li>
								{/each}
							</ul>
						</div>
					</div>
				{:else if $session?.status === 'preparing'}
					<div class="mt-6 space-y-4">
						<h3 class="font-medium">Group Management</h3>
						{#if creating}
							<div class="space-y-4">
								<div class="flex items-center gap-2">
									<Label for="groupNumber">Group Number</Label>
									<Input
										id="groupNumber"
										type="number"
										bind:value={groupNumber}
										min="1"
										max="50"
										placeholder="Enter group number (1-50)"
									/>
								</div>
								<Button color="primary" on:click={handleJoinGroup}>
									<UserPlus class="mr-2 h-4 w-4" />
									Join Group
								</Button>
							</div>
						{:else}
							<Button color="primary" on:click={handleCreateGroup} disabled={isCreatingGroup}>
								<Users class="mr-2 h-4 w-4" />
								{isCreatingGroup ? 'Creating...' : 'Create New Group'}
							</Button>
						{/if}
						<Button color="alternative" on:click={() => (creating = !creating)}>
							{creating ? 'Cancel' : 'Join Existing Group'}
						</Button>
					</div>
				{:else}
					<p class="text-gray-600">You are not in a group yet.</p>
				{/if}
			</div>
		</div>

		<div class="max-h-[calc(100vh-12rem)] overflow-y-auto rounded-lg border p-6 md:col-span-3">
			{#if $session?.status === 'preparing'}
				<div class="mt-4">
					<h3 class="mb-2 font-medium">Waiting for session to start...</h3>
					<p class="text-gray-600">The host will begin the session shortly.</p>
				</div>
			{:else if $session?.status === 'individual'}
				<Chatroom record={handleRecord} send={handleSend} {conversations} />
			{:else if $session?.status === 'before-group'}
				<div class="space-y-6">
					{#if groupDoc && conversationDoc}
						<Summary
							conversation={conversationDoc}
							loading={loadingSummary}
							onRefresh={fetchSummary}
						/>
					{/if}
				</div>
			{:else if $session?.status === 'group'}
				{#if groupStatus === 'discussion' && !loadingGroupSummary}
					<Chatroom
						conversations={groupDiscussions}
						record={handleGroupRecord}
						send={handleGroupSend}
					/>
				{:else if groupStatus === 'summarize' || loadingGroupSummary}
					<div class="space-y-6">
						{#if groupDoc}
							<GroupSummary
								group={groupDoc}
								loading={loadingGroupSummary}
								onRefresh={fetchGroupSummary}
								onUpdate={handleUpdateGroupSummary}
							/>
						{/if}
					</div>
				{:else if groupStatus === 'end'}
					<div class="space-y-6">
						{#if groupDoc}
							<GroupSummary
								readonly
								group={groupDoc}
								loading={loadingGroupSummary}
								onRefresh={fetchGroupSummary}
								onUpdate={handleUpdateGroupSummary}
							/>
						{/if}
					</div>
				{/if}
			{:else if $session?.status === 'ended'}
				<EndedView {conversationDoc} {groupDoc} {user} />
			{/if}
		</div>
	</div>
</main>
