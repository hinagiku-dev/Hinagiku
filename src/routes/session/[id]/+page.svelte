<script lang="ts">
	import QRCode from '$lib/components/QRCode.svelte';
	import { db } from '$lib/firebase';
	import type { FirestoreSession } from '$lib/types/session';
	import { convertFirestoreSession } from '$lib/types/session';
	import { Play, Users, Link, FileText, Clock } from 'lucide-svelte';
	import { onSnapshot, doc } from 'firebase/firestore';

	let { data } = $props();
	let { session, isHost } = $state(data);

	async function startSession() {
		const response = await fetch(`/api/session/${session.id}/start`, {
			method: 'POST'
		});

		if (response.ok) {
			const result = await response.json();
			session.tempId = result.tempId;
			session.tempIdExpiry = result.tempIdExpiry;
			session.status = 'waiting';
		}
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleString();
	}

	$effect(() => {
		// Subscribe to real-time updates using client-side Firebase
		const unsubscribe = onSnapshot(doc(db, 'sessions', session.id), (doc) => {
			if (doc.exists()) {
				const data = doc.data() as FirestoreSession;
				session = convertFirestoreSession(data);
			}
		});

		return unsubscribe;
	});
</script>

<main class="mx-auto max-w-4xl px-4 py-16">
	<div class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">{session.title}</h1>
			<p class="mt-2 text-gray-600">Hosted by {session.hostName}</p>
		</div>

		{#if isHost}
			<div class="flex items-center gap-4">
				<div class="flex items-center gap-2">
					<Users size={20} />
					<span>{Object.keys(session.participants).length} participants</span>
				</div>

				{#if session.status === 'draft'}
					<button
						class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
						onclick={startSession}
					>
						<Play size={20} />
						Start Session
					</button>
				{/if}
			</div>
		{/if}
	</div>

	<div class="grid gap-8 md:grid-cols-2">
		<!-- Left Column -->
		<div class="space-y-8">
			<!-- Session Status -->
			<div class="rounded-lg border p-6">
				<h2 class="mb-4 text-xl font-semibold">Session Status</h2>
				<div class="flex items-center gap-2">
					<span
						class={`inline-block h-3 w-3 rounded-full ${
							session.status === 'draft'
								? 'bg-gray-500'
								: session.status === 'waiting'
									? 'bg-yellow-500'
									: session.status === 'active'
										? 'bg-green-500'
										: 'bg-red-500'
						}`}
					></span>
					<span class="capitalize">{session.status}</span>
				</div>

				{#if session.tempId && session.tempIdExpiry}
					<div class="mt-4">
						<p class="mb-2">Session Code: <strong>{session.tempId}</strong></p>
						<QRCode value={session.tempId} />
						<p class="mt-2 text-sm text-gray-600">
							<Clock size={16} class="mr-1 inline" />
							Expires at {formatDate(session.tempIdExpiry)}
						</p>
					</div>
				{/if}
			</div>

			<!-- Resources (Host Only) -->
			{#if isHost}
				<div class="rounded-lg border p-6">
					<h2 class="mb-4 text-xl font-semibold">Resources</h2>
					{#if Object.keys(session.resources).length === 0}
						<p class="text-gray-600">No resources added yet</p>
					{:else}
						<div class="space-y-3">
							{#each Object.entries(session.resources) as [, resource]}
								<div class="flex items-start gap-3 rounded-lg border p-3">
									{#if resource.type === 'link'}
										<Link size={20} class="mt-1 text-blue-600" />
									{:else}
										<FileText size={20} class="mt-1 text-gray-600" />
									{/if}
									<div>
										{#if resource.type === 'link'}
											<a
												href={resource.content}
												target="_blank"
												rel="noopener noreferrer"
												class="text-blue-600 hover:underline"
											>
												{resource.content}
											</a>
										{:else}
											<p>{resource.content}</p>
										{/if}
										<p class="mt-1 text-sm text-gray-500">
											Added {formatDate(resource.addedAt)}
										</p>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Right Column -->
		<div class="space-y-8">
			<!-- Participants -->
			<div class="rounded-lg border p-6">
				<h2 class="mb-4 text-xl font-semibold">Participants</h2>
				{#if Object.keys(session.participants).length === 0}
					<p class="text-gray-600">No participants yet</p>
				{:else}
					<div class="space-y-3">
						{#each Object.entries(session.participants) as [userId, participant]}
							<div class="flex items-center justify-between rounded-lg border p-3">
								<div>
									<p class="font-medium">
										{participant.name}
										{#if userId === session.hostId}
											<span class="ml-2 text-sm text-blue-600">(Host)</span>
										{/if}
									</p>
									<p class="text-sm text-gray-500">
										Joined {formatDate(participant.joinedAt)}
									</p>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Discussion Area (Placeholder) -->
			<div class="rounded-lg border p-6">
				<h2 class="mb-4 text-xl font-semibold">Discussion</h2>
				<p class="text-gray-600">
					{#if session.status === 'draft'}
						Waiting for the host to start the session...
					{:else if session.status === 'waiting'}
						Waiting for participants to join...
					{:else if session.status === 'ended'}
						This session has ended.
					{:else}
						Discussion in progress...
					{/if}
				</p>
			</div>
		</div>
	</div>
</main>
