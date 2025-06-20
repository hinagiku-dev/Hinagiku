<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Card, Button, Modal } from 'flowbite-svelte';
	import { MessageSquarePlus } from 'lucide-svelte';
	import { collection, orderBy, query, where, Timestamp, limit } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import { subscribeAll } from '$lib/firebase/store';
	import type { Session } from '$lib/schema/session';
	import { writable, derived } from 'svelte/store';
	import SessionCard from '$lib/components/SessionCard.svelte';
	import { deploymentConfig } from '$lib/config/deployment';
	import * as m from '$lib/paraglide/messages.js';
	import { notifications } from '$lib/stores/notifications';
	let { data } = $props();

	let [hostSessions, { unsubscribe: unsubscribe }] = subscribeAll<Session>(
		query(
			collection(db, 'sessions'),
			where('host', '==', data.user.uid),
			orderBy('createdAt', 'desc'),
			limit(100)
		)
	);

	let selectedLabels = writable<string[]>([]);

	let filteredHostSessions = derived(
		[hostSessions, selectedLabels],
		([$hostSessions, $selectedLabels]) => {
			if (!$hostSessions || $selectedLabels.length === 0) return $hostSessions;
			return $hostSessions.filter(([, session]) =>
				$selectedLabels.every((label) => session.labels?.includes(label))
			);
		}
	);

	let availableLabels = derived(hostSessions, ($hostSessions) => {
		if (!$hostSessions) return [];
		const labels = new Set<string>();
		$hostSessions.forEach(([, session]) => {
			session.labels?.forEach((label) => labels.add(label));
		});
		return Array.from(labels).sort();
	});

	function handleLabelSelect(label: string) {
		selectedLabels.update((labels) => {
			if (labels.includes(label)) {
				return labels.filter((l) => l !== label);
			}
			return [...labels, label].sort();
		});
	}

	onDestroy(() => {
		unsubscribe();
	});

	let selectStatus = writable(false);
	let selectedSession = writable<string[][]>([]);
	let selectedIsArchived = writable(0); // 0 equals none, 1 equals active, 2 equals archived
	async function handleSelectSession() {
		$selectStatus = !$selectStatus;
	}
	function toggleSessionSelection(id: string, isChecked: boolean, active_status?: string) {
		const status = active_status || 'active';
		if (
			isChecked &&
			($selectedIsArchived === (status === 'archived' ? 2 : 1) || $selectedIsArchived === 0)
		) {
			$selectedSession = [...$selectedSession, [id, status]];
			$selectedIsArchived = status === 'archived' ? 2 : 1;
			return true;
		} else {
			$selectedSession = $selectedSession.filter((session) => session[0] !== id);
			if ($selectedSession.length === 0) {
				$selectedIsArchived = 0;
			}
			return false;
		}
	}
	let showArchiveModal = writable(false);
	async function archiveSelectedSession() {
		if ($selectedSession.length === 0) {
			notifications.error(m.atLeastOneSelected());
			return;
		}
		$showArchiveModal = true;
		console.log('Selected sessions for archiving:', $selectedSession);
	}
	async function confirmArchiveSessions() {
		try {
			$selectedSession.forEach(async ([id, active_status]) => {
				$selectedIsArchived = 0;
				if (active_status === 'archived') {
					const fetchResponse = await fetch(`/api/session/${id}/action/unarchive`, {
						method: 'POST'
					});
					const result = await fetchResponse.json();
					if (!fetchResponse.ok) {
						throw new Error(result.error || m.archiveFailed());
					}
				} else {
					const fetchResponse = await fetch(`/api/session/${id}/action/archive`, {
						method: 'POST'
					});
					const result = await fetchResponse.json();
					if (!fetchResponse.ok) {
						throw new Error(result.error || m.archiveFailed());
					}
				}
			});

			notifications.success(m.successBatchArchive({ count: $selectedSession.length }));
			$selectedSession = [];
			$selectStatus = false;
			$showArchiveModal = false;
		} catch (e) {
			console.error('Error archiving sessions:', e);
			notifications.error(m.failedBatchArchive());
		}
	}
</script>

<svelte:head>
	<title>{m.recentHostActivity()} | {deploymentConfig.siteTitle}</title>
</svelte:head>

<main class="mx-auto max-w-6xl px-4 py-16">
	<div class="mb-12 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">{m.recentHostActivity()}</h1>
		</div>
		<div class="text-right">
			{#if $selectStatus}
				<Button color="primary" on:click={archiveSelectedSession} class="mr-4">
					{#if $selectedIsArchived === 2}
						{m.unarchive()}
					{:else if $selectedIsArchived === 1}
						{m.archive()}
					{:else}
						{m.archiveAndUnarchive()}
					{/if}
				</Button>
			{/if}
			<Button onclick={handleSelectSession} color="alternative">
				{#if $selectStatus}
					{m.cancel()}
				{:else}
					{m.select()}
				{/if}
			</Button>
			<Button class="ml-4" href="/dashboard">{m.backToDashboard()}</Button>
		</div>
	</div>

	<div class="my-8">
		<div class="mb-4 flex flex-wrap gap-2">
			{#each $availableLabels as label}
				<Button
					size="xs"
					color={$selectedLabels.includes(label) ? 'primary' : 'alternative'}
					on:click={() => handleLabelSelect(label)}
				>
					{label}
				</Button>
			{/each}
		</div>
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#if $filteredHostSessions?.length}
				{#each $filteredHostSessions as [doc, session]}
					{#if session.active_status === 'active' || !session.active_status}
						<div class="relative h-full">
							{#if $selectStatus}
								<input
									type="checkbox"
									class="absolute right-3 top-3 z-10"
									checked={$selectedSession.some(
										([id, status]) => id === doc.id && status === session.active_status
									)}
									onchange={(e) =>
										(e.currentTarget.checked = toggleSessionSelection(
											doc.id,
											e.currentTarget.checked,
											session.active_status
										))}
								/>
							{/if}
							<SessionCard
								id={doc.id}
								title={session.title}
								status={session.status}
								labels={session.labels}
								task={session.task}
								createdAt={(session.createdAt as Timestamp).toDate()}
							/>
						</div>
					{/if}
				{/each}
				{#each $filteredHostSessions as [doc, session]}
					{#if session.active_status === 'archived'}
						<div class="relative h-full">
							{#if $selectStatus}
								<input
									type="checkbox"
									class="absolute right-3 top-3 z-10"
									checked={$selectedSession.some(
										([id, status]) => id === doc.id && status === session.active_status
									)}
									onchange={(e) =>
										(e.currentTarget.checked = toggleSessionSelection(
											doc.id,
											e.currentTarget.checked,
											session.active_status
										))}
								/>
							{/if}
							<SessionCard
								id={doc.id}
								title={session.title}
								status={session.status}
								labels={session.labels}
								task={session.task}
								createdAt={(session.createdAt as Timestamp).toDate()}
								archived={true}
							/>
						</div>
					{/if}
				{/each}
			{:else}
				<Card class="md:col-span-2 lg:col-span-3">
					<div class="p-8 text-center">
						<div class="mb-4 inline-flex rounded-full bg-primary-100 p-4">
							<MessageSquarePlus size={32} class="text-primary-600" />
						</div>
						<p class="mb-2 text-lg font-medium text-gray-900">
							{m.noSessions()}
						</p>
						<p class="mb-4 text-gray-600">
							{m.createSession()}
						</p>
					</div>
				</Card>
			{/if}
		</div>
	</div>
</main>

<Modal bind:open={$showArchiveModal} size="xs" autoclose>
	<div class="text-center">
		<h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
			{#if $selectedIsArchived === 2}
				{m.unarchiveConfirmSession()}
			{:else if $selectedIsArchived === 1}
				{m.archiveConfirmSession()}
			{/if}
		</h3>
		<div class="flex justify-center gap-4">
			<Button color="red" on:click={confirmArchiveSessions}>
				{#if $selectedIsArchived === 2}
					{m.unarchive()}
				{:else if $selectedIsArchived === 1}
					{m.archive()}
				{/if}
			</Button>
			<Button color="alternative" on:click={() => ($showArchiveModal = false)}
				>{m.noCancel()}</Button
			>
		</div>
	</div>
</Modal>
