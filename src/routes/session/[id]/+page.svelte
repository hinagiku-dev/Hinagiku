<script lang="ts">
	import QRCode from '$lib/components/QRCode.svelte';
	import { db } from '$lib/firebase';
	import type { FirestoreSession } from '$lib/types/session';
	import { convertFirestoreSession } from '$lib/types/session';
	import { Trash2, Play, Users, FileText, Clock, CircleX, Plus } from 'lucide-svelte';
	import { onSnapshot, doc } from 'firebase/firestore';
	function debounce<T extends (...args: unknown[]) => void>(
		func: T,
		wait: number
	): (...args: Parameters<T>) => void {
		let timeout: ReturnType<typeof setTimeout>;
		return function (this: unknown, ...args: Parameters<T>) {
			clearTimeout(timeout);
			timeout = setTimeout(() => func.apply(this, args), wait);
		};
	}

	let resources = $state([{ type: 'text', content: '' }]);

	function addResource() {
		resources = [...resources, { type: 'text', content: '' }];
	}

	function removeResource(index: number) {
		resources = resources.filter((_, i) => i !== index);
	}

	removeResource(0);

	function applyChanges(newtitle: string, resources: Array<{ type: string; content: string }>) {
		newtitle = 'Do somthing';
		console.log('Fxck you eslint', resources.length);
		// Apply changes to Firestore
	}

	function confirmResourcesChanges() {
		applyChanges(newtitle, resources);
		resources = [];
	}

	let { data } = $props();
	let { session, isHost } = $state(data);
	let goalInput = $state(data.session.goal || '');
	let subQuestionsInput = $state(data.session.subQuestions || []);
	// value = session.goal = "";
	// onchange = {debounce(handleAutoSave, 300)}
	function addSubQuestion() {
		subQuestionsInput.push('');
	}

	function removeSubQuestion(index: number) {
		subQuestionsInput.splice(index, 1);
		saveSession();
	}

	async function saveSession() {
		const response = await fetch(`/api/session/${session.id}/save`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				sessionId: session.id,
				goal: goalInput,
				subQuestions: subQuestionsInput
			})
		});

		if (response.ok) {
			const messageElement = document.getElementById('auto-save-message');
			if (messageElement) {
				messageElement.textContent = '已自動儲存';
				setTimeout(() => {
					messageElement.textContent = '';
				}, 2000);
			}
		} else {
			console.error('Failed to save session');
		}
	}

	// svelte-ignore state_referenced_locally
	let newtitle = $state(session.title);

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

	async function startIndividualStage() {
		session.status = 'individual';
		if (isHost) {
			window.location.href = `/session/${session.id}/status`;
		} else {
			window.location.href = `/session/${session.id}/participant`;
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

	let { isEditing } = $state({ isEditing: false });
	let { newTitle } = $state({ newTitle: '' });

	function startEditing() {
		isEditing = true;
		newTitle = session.title;
	}

	function stopEditing(event: Event) {
		isEditing = false;
		if (event) {
			event.preventDefault();
			const form = event.target && (event.target as HTMLElement).closest('form');
			if (form) {
				form.submit();
			}
		}
	}
</script>

<main class="mx-auto max-w-4xl px-4 py-16">
	<div class="mb-8 flex items-center justify-between">
		<div>
			{#if isHost}
				{#if isEditing}
					<form method="POST" action="?/updateTitle" onsubmit={stopEditing}>
						<input type="hidden" name="sessionId" value={session.id} />
						<input
							type="text"
							name="title"
							bind:value={newTitle}
							class="text-3xl font-bold"
							onblur={stopEditing}
						/>
						<button type="submit" class="ml-2 text-blue-600 hover:text-blue-800">Save</button>
					</form>
				{:else}
					<div class="flex items-center">
						<h1 class="text-3xl font-bold">{session.title}</h1>
						<button
							onclick={startEditing}
							class="ml-2 text-gray-600 hover:text-gray-800"
							aria-label="Edit title"
						>
							編輯(要換成圖標)
						</button>
					</div>
				{/if}
			{:else}
				<div class="flex items-center">
					<h1 class="text-3xl font-bold">{session.title}</h1>
				</div>
			{/if}
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
				{:else if session.status === 'waiting'}
					<button
						class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
						onclick={startIndividualStage}
					>
						<Play size={20} />
						開始討論
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
					<button
						type="button"
						class="inline-flex items-center gap-2 rounded-lg border px-3 py-1 hover:bg-gray-50"
						onclick={addResource}
					>
						<Plus size={16} />
						Add Resource
					</button>
					{#each resources as resource, i}
						<div class="flex gap-2">
							<select
								name={`resourceType${i}`}
								class="rounded-lg border p-2"
								bind:value={resource.type}
							>
								<option value="text">Text</option>
								<option value="link">Link</option>
							</select>
							<input
								type="text"
								name={`resourceContent${i}`}
								class="flex-1 rounded-lg border p-2"
								placeholder={resource.type === 'link' ? 'Enter URL' : 'Enter text content'}
								bind:value={resource.content}
							/>
							<button
								type="button"
								class="rounded-lg border p-2 hover:bg-gray-50"
								onclick={() => removeResource(i)}
							>
								<Trash2 size={20} />
							</button>
						</div>
					{/each}

					{#if resources.length != 0}
						<button
							type="button"
							class="rounded-lg border p-2 hover:bg-gray-50"
							onclick={confirmResourcesChanges}
						>
							Apply Changes
						</button>
					{/if}

					{#if Object.keys(session.resources).length === 0}
						<p class="text-gray-600">No resources added yet</p>
					{:else}
						<div class="space-y-3">
							{#each Object.entries(session.resources) as [, resource]}
								<div class="flex items-start gap-3 rounded-lg border p-3">
									<FileText size={20} class="mt-1 text-gray-600" />
									<div>
										<p>{resource.text}</p>
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
			{#if isHost}
				<div class="rounded-lg border p-6">
					<div class="flex items-center justify-between">
						<h2 class="mb-4 text-xl font-semibold">任務</h2>
						<form method="POST" action="?/generateSubQuestions">
							<button
								type="submit"
								class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
								>自動生成子問題</button
							>
						</form>
					</div>
					<div class="space-y-4">
						<div>
							<label for="goal" class="block text-sm font-medium text-gray-700">目標</label>
							<input
								type="text"
								id="goal"
								bind:value={goalInput}
								class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
								onchange={debounce(saveSession, 1000)}
							/>
						</div>
						{#each Array.from({ length: subQuestionsInput.length }, (_, index) => index) as index}
							<div class="flex flex-col gap-2">
								<label for={`subQuestion-${index}`} class="block text-sm font-medium text-gray-700"
									>子問題 {index + 1}</label
								>
								<div class="flex items-center gap-2">
									<input
										type="text"
										id={`subQuestion-${index}`}
										bind:value={subQuestionsInput[index]}
										class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
										onchange={debounce(saveSession, 1000)}
									/>
									<button
										onclick={() => removeSubQuestion(index)}
										class="ml-2 text-red-600 hover:text-red-800">-</button
									>
								</div>
							</div>
						{/each}
						<button onclick={addSubQuestion} class="mt-2 text-blue-600 hover:text-blue-800"
							>新增子問題</button
						>
					</div>
					<p id="auto-save-message" class="text-sm text-red-500"></p>
				</div>
			{/if}
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
									{#if !(userId === session.hostId) && isHost}
										<button class="h-6"><CircleX size={20} /></button>
									{/if}
									<p class="inline-block font-medium">
										{participant.name}
										{#if userId === session.hostId}
											<span class="ml-2 text-sm text-blue-600">(Host)</span>
										{/if}
									</p>
									<p class="text-sm text-gray-500">
										Joined {formatDate(participant.joinedAt)}
									</p>
								</div>
								{#if isHost}
									<form method="POST" action="?/deleteParticipant">
										<input type="hidden" name="participantId" value={userId} />
										<input type="hidden" name="sessionId" value={session.id} />
										<button type="submit" class="ml-4 text-red-600 hover:text-red-800">
											Remove
										</button>
									</form>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</main>
