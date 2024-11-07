<script lang="ts">
	import { enhance } from '$app/forms';
	import QRCode from '$lib/components/QRCode.svelte';
	import QrScanner from '$lib/components/QrScanner.svelte';
	import { db } from '$lib/firebase';
	import type { FirestoreSession } from '$lib/types/session';
	import { convertFirestoreSession } from '$lib/types/session';
	import { onSnapshot, doc } from 'firebase/firestore';
	import { Users, Mic, MessageSquare } from 'lucide-svelte';

	let { data } = $props();
	let { session, user } = $state(data);
	let showScanner = $state(false);
	let isRecording = $state(false);
	let currentGroupId = $state<string | null>(null);

	// Find user's current group
	$effect(() => {
		for (const [groupId, group] of Object.entries(session.groups || {})) {
			if (user.uid in group.members) {
				currentGroupId = groupId;
				break;
			}
		}
	});

	function handleScanGroup(groupId: string) {
		console.log(groupId);
		// Join group logic
		showScanner = false;
	}

	async function startRecording() {
		isRecording = true;
		// Implement recording logic
	}

	async function stopRecording() {
		isRecording = false;
		// Implement stop recording logic
	}

	$effect(() => {
		const unsubscribe = onSnapshot(doc(db, 'sessions', session.id), (doc) => {
			if (doc.exists()) {
				const data = doc.data() as FirestoreSession;
				session = convertFirestoreSession(data);
			}
		});

		return unsubscribe;
	});
</script>

<main class="mx-auto max-w-4xl px-4 py-8">
	<div class="mb-8">
		<h1 class="text-3xl font-bold">{session.title}</h1>
		<p class="mt-2 text-gray-600">Hosted by {session.hostName}</p>
	</div>

	<!-- Stage Display -->
	<div class="mb-8 rounded-lg border p-6">
		<h2 class="mb-4 text-xl font-semibold">Current Stage</h2>
		<div class="flex items-center gap-4">
			<div class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
				{#if session.stage === 'grouping'}
					<Users class="text-blue-600" />
				{:else if session.stage === 'individual'}
					<Mic class="text-blue-600" />
				{:else if session.stage === 'group'}
					<MessageSquare class="text-blue-600" />
				{/if}
			</div>
			<div>
				<p class="font-medium capitalize">{session.stage}</p>
				<p class="text-sm text-gray-600">
					{#if session.stage === 'grouping'}
						Join or create a group to begin the discussion
					{:else if session.stage === 'individual'}
						Share your thoughts on the topic individually
					{:else if session.stage === 'group'}
						Discuss with your group members
					{:else}
						Session has ended
					{/if}
				</p>
			</div>
		</div>
	</div>

	<!-- Grouping Stage -->
	{#if session.stage === 'grouping'}
		{#if !currentGroupId}
			<div class="grid gap-4 md:grid-cols-2">
				<form method="POST" action="?/createGroup" use:enhance class="rounded-lg border p-6">
					<h3 class="mb-4 text-lg font-semibold">Create New Group</h3>
					<div class="space-y-4">
						<div>
							<label for="groupName" class="mb-2 block text-sm font-medium">Group Name</label>
							<input
								type="text"
								id="groupName"
								name="groupName"
								required
								class="w-full rounded-lg border p-2"
							/>
						</div>
						<button
							type="submit"
							class="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
						>
							Create Group
						</button>
					</div>
				</form>

				<div class="rounded-lg border p-6">
					<h3 class="mb-4 text-lg font-semibold">Join Existing Group</h3>
					<div class="space-y-4">
						<button
							type="button"
							class="w-full rounded-lg border px-4 py-2 hover:bg-gray-50"
							onclick={() => (showScanner = !showScanner)}
						>
							{showScanner ? 'Hide Scanner' : 'Scan Group QR Code'}
						</button>
						{#if showScanner}
							<QrScanner onScan={handleScanGroup} />
						{/if}
					</div>
				</div>
			</div>
		{:else}
			<div class="rounded-lg border p-6">
				<h3 class="mb-4 text-lg font-semibold">Your Group</h3>
				<div class="space-y-4">
					<p>Group Name: {session.groups[currentGroupId].name}</p>
					<div>
						<p class="mb-2 font-medium">Members:</p>
						<ul class="space-y-2">
							{#each Object.entries(session.groups[currentGroupId].members) as [memberId, member]}
								<li class="flex items-center gap-2">
									<span>{member.name}</span>
									{#if memberId === session.groups[currentGroupId].leaderId}
										<span class="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-600">
											Leader
										</span>
									{/if}
								</li>
							{/each}
						</ul>
					</div>
					{#if user.uid === session.groups[currentGroupId].leaderId}
						<div>
							<p class="mb-2">Group QR Code:</p>
							<QRCode value={currentGroupId} />
						</div>
					{/if}
				</div>
			</div>
		{/if}
	{/if}

	<!-- Individual Discussion Stage -->
	{#if session.stage === 'individual'}
		<div class="rounded-lg border p-6">
			<h3 class="mb-4 text-lg font-semibold">Individual Discussion</h3>
			<div class="space-y-4">
				<button
					type="button"
					class="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
					onclick={isRecording ? stopRecording : startRecording}
				>
					<Mic size={20} />
					{isRecording ? 'Stop Recording' : 'Start Recording'}
				</button>
				{#if isRecording}
					<div class="rounded-lg bg-blue-50 p-4">
						<p class="text-blue-600">Recording in progress...</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Group Discussion Stage -->
	{#if session.stage === 'group'}
		<div class="rounded-lg border p-6">
			<h3 class="mb-4 text-lg font-semibold">Group Discussion</h3>
			<div class="space-y-4">
				<button
					type="button"
					class="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
					onclick={isRecording ? stopRecording : startRecording}
				>
					<Mic size={20} />
					{isRecording ? 'Stop Recording' : 'Start Recording'}
				</button>
				{#if isRecording}
					<div class="rounded-lg bg-blue-50 p-4">
						<p class="text-blue-600">Recording in progress...</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</main>
