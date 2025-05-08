<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { writable, derived } from 'svelte/store';
	import { Card, Button } from 'flowbite-svelte';
	import { MessageSquarePlus, UserPlus, UserCog } from 'lucide-svelte';
	import {
		collection,
		orderBy,
		limit,
		query,
		where,
		Timestamp,
		collectionGroup,
		getDoc,
		getDocs
	} from 'firebase/firestore';
	import { profile } from '$lib/stores/profile';
	import { db } from '$lib/firebase';
	import { subscribeAll } from '$lib/firebase/store';
	import type { Template } from '$lib/schema/template';
	import type { Session } from '$lib/schema/session';
	import { goto } from '$app/navigation';
	import { createTemplate } from './createTemplate';
	import { notifications } from '$lib/stores/notifications';
	import { browser } from '$app/environment';
	import { user } from '$lib/stores/auth';
	import TemplateCard from '$lib/components/TemplateCard.svelte';
	import SessionCard from '$lib/components/SessionCard.svelte';
	import { i18n } from '$lib/i18n';
	import Title from '$lib/components/Title.svelte';

	import * as m from '$lib/paraglide/messages.js';

	let { data } = $props();

	// Query for user's templates
	let [templates, { unsubscribe: unsubscribe1 }] = browser
		? subscribeAll<Template>(
				query(
					collection(db, 'templates'),
					where('owner', '==', data.user.uid),
					orderBy('createdAt', 'desc'),
					limit(6)
				)
			)
		: [null, { unsubscribe: () => {} }];

	// Query for public templates
	let [publicTemplates, { unsubscribe: unsubscribe2 }] = browser
		? subscribeAll<Template>(
				query(
					collection(db, 'templates'),
					where('public', '==', true),
					orderBy('createdAt', 'desc'),
					limit(6)
				)
			)
		: [null, { unsubscribe: () => {} }];

	let [hostSessions, { unsubscribe: unsubscribe3 }] = browser
		? subscribeAll<Session>(
				query(
					collection(db, 'sessions'),
					where('host', '==', data.user.uid),
					orderBy('createdAt', 'desc'),
					limit(6)
				)
			)
		: [writable([]), { unsubscribe: () => {} }];

	let sessions = writable<[string, Session][]>([]);

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

	function handleLabelSelect(label: string) {
		selectedLabels.update((labels) => {
			if (labels.includes(label)) {
				return labels.filter((l) => l !== label);
			}
			return [...labels, label].sort();
		});
	}

	let availableLabels = derived(hostSessions, ($hostSessions) => {
		if (!$hostSessions) return [];
		const labels = new Set<string>();
		$hostSessions.forEach(([, session]) => {
			session.labels?.forEach((label) => labels.add(label));
		});
		return Array.from(labels).sort();
	});

	async function getSessions() {
		const sessionQuery = query(
			collectionGroup(db, 'groups'),
			where('participants', 'array-contains', data.user.uid),
			orderBy('createdAt', 'desc'),
			limit(6)
		);
		const sessionSnapshot = await getDocs(sessionQuery);
		const sess: Promise<[string, Session]>[] = [];
		for (const groupDoc of sessionSnapshot.docs) {
			const sessionDocRef = groupDoc.ref.parent.parent;
			if (sessionDocRef) {
				sess.push(
					(async () => {
						const sessionDoc = await getDoc(sessionDocRef);
						const session = sessionDoc.data() as Session;
						return [sessionDoc.id, { ...session, host: session.host }];
					})()
				);
			}
		}
		sessions.set(await Promise.all(sess));
	}

	onMount(() => {
		getSessions();
	});

	async function handleCreateTemplate() {
		try {
			const id = await createTemplate();
			notifications.success('Template created successfully');
			await goto(i18n.resolveRoute(`/template/${id}`));
		} catch (error) {
			console.error('Error creating template:', error);
			notifications.error('Failed to create template');
		}
	}

	onDestroy(() => {
		unsubscribe1();
		unsubscribe2();
		unsubscribe3();
	});

	let selectStatus = writable(false);
	let selectedTemplates = writable<string[]>([]);
	let selectAllStatus = writable(false);

	async function handleSelectTemplate() {
		$selectStatus = $selectStatus ? false : true;
	}

	function toggleTemplateSelection(id: string, isChecked: boolean) {
		if (isChecked) {
			$selectedTemplates = [...$selectedTemplates, id];
		} else {
			$selectedTemplates = $selectedTemplates.filter((templateId) => templateId !== id);
		}
	}

	function selectAllTemplates() {
		if ($selectAllStatus) {
			$selectedTemplates = [];
			$selectAllStatus = false;
		} else {
			if ($templates) {
				$selectedTemplates = $templates.map(([doc]) => doc.id);
			}
			$selectAllStatus = true;
		}
	}

	async function deleteSelectedTemplates() {
		if ($selectedTemplates.length === 0) {
			notifications.error('請選擇至少一個模板來刪除');
			return;
		}

		try {
			if (!confirm(`確定要刪除 ${$selectedTemplates.length} 個模板嗎？`)) {
				return;
			}

			const deletePromises = $selectedTemplates.map((id) =>
				fetch(`/api/template/${id}`, { method: 'DELETE' })
			);

			await Promise.all(deletePromises);
			notifications.success(`成功刪除 ${$selectedTemplates.length} 個模板`);
			$selectedTemplates = [];
			$selectStatus = false;
		} catch (e) {
			console.error('刪除模板時出錯:', e);
			notifications.error('刪除模板失敗');
		}
	}
</script>

<main class="mx-auto max-w-6xl px-4 py-16">
	<div class="mb-12">
		<h1 class="text-3xl font-bold text-gray-900">{m.dashboard()}</h1>
		<p class="mt-2 text-gray-600">
			{m.welcomeDashboard()}, {$profile?.displayName || $user?.displayName}
		</p>
	</div>

	<!-- Main Actions -->
	<div class="mb-16 grid gap-6 md:grid-cols-3">
		<Card padding="xl" class="text-center transition-all hover:border-primary-500">
			<button onclick={handleCreateTemplate} class="flex w-full flex-col items-center">
				<div class="mb-4 rounded-full bg-primary-100 p-4">
					<MessageSquarePlus size={32} class="text-primary-600" />
				</div>
				<h2 class="mb-2 text-xl font-semibold text-gray-900">
					{m.createTemplate()}
				</h2>
				<p class="text-gray-600">{m.createTemplateDesc()}</p>
			</button>
		</Card>

		<Card padding="xl" class="text-center transition-all hover:border-primary-500">
			<a href="/join" class="flex flex-col items-center">
				<div class="mb-4 rounded-full bg-primary-100 p-4">
					<UserPlus size={32} class="text-primary-600" />
				</div>
				<h2 class="mb-2 text-xl font-semibold text-gray-900">
					{m.dashjoinSession()}
				</h2>
				<p class="text-gray-600">{m.dashjoinSessionDesc()}</p>
			</a>
		</Card>

		<Card padding="xl" class="text-center transition-all hover:border-primary-500">
			<a href="/profile" class="flex flex-col items-center">
				<div class="mb-4 rounded-full bg-primary-100 p-4">
					<UserCog size={32} class="text-primary-600" />
				</div>
				<h2 class="mb-2 text-xl font-semibold text-gray-900">
					{m.editProfile()}
				</h2>
				<p class="text-gray-600">{m.editProfileDesc()}</p>
			</a>
		</Card>
	</div>

	<!-- Public Templates -->
	<div class="mb-16">
		<div class="mb-6 flex items-center justify-between">
			<h2 class="text-2xl font-semibold text-gray-900">
				{m.publicTemplates()}
			</h2>
			<Button color="alternative" href="/templates/public">{m.viewAll()}</Button>
		</div>
		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#if $publicTemplates?.length}
				{#each $publicTemplates as [doc, template]}
					<TemplateCard
						id={doc.id}
						title={template.title}
						task={template.task}
						subtaskSize={template.subtasks.length}
						resourceSize={template.resources.length}
						owner={template.owner}
					/>
				{/each}
			{:else}
				<!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
				{#each Array(3) as _}
					<Card padding="lg">
						<div class="text-center">
							<h3 class="mb-2 text-xl font-bold">Example Template</h3>
							<p class="mb-4 text-gray-600">
								{m.createFirstTemplate()}
							</p>
							<Button onclick={handleCreateTemplate} class="w-full"
								>{m.createTemplateButton()}</Button
							>
						</div>
					</Card>
				{/each}
			{/if}
		</div>
	</div>

	<!-- Your Templates -->
	<div>
		<div class="mb-6 flex items-center justify-between">
			<h2 class="text-2xl font-semibold text-gray-900">{m.yourTemplates()}</h2>
			<div class="ml-auto flex space-x-4">
				{#if $selectStatus}
					<Button color="red" onclick={deleteSelectedTemplates}>{m.deleteSelectedTemplate()}</Button
					>
					<Button color="primary" onclick={selectAllTemplates}>
						{#if $selectAllStatus}
							{m.deselectAll()}
						{:else}
							{m.selectAll()}
						{/if}
					</Button>
					<Button color="alternative" onclick={handleSelectTemplate}>{m.selectTemplate()}</Button>
				{:else}
					<Button color="primary" onclick={handleSelectTemplate}>{m.selectTemplate()}</Button>
				{/if}

				<Button color="alternative" href="/templates">{m.viewAll()}</Button>
			</div>
		</div>
		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#if $templates?.length}
				{#each $templates as [doc, template]}
					<div class="relative h-full">
						{#if $selectStatus}
							<input
								type="checkbox"
								class="absolute right-3 top-3 z-10"
								checked={$selectedTemplates.includes(doc.id)}
								onchange={(e) => toggleTemplateSelection(doc.id, e.currentTarget.checked)}
							/>
						{/if}
						<TemplateCard
							id={doc.id}
							title={template.title}
							task={template.task}
							subtaskSize={template.subtasks.length}
							resourceSize={template.resources.length}
							owner={template.owner}
							isPublic={template.public}
						/>
					</div>
				{/each}
			{:else}
				<Card class="md:col-span-2 lg:col-span-3">
					<div class="p-8 text-center">
						<div class="mb-4 inline-flex rounded-full bg-primary-100 p-4">
							<MessageSquarePlus size={32} class="text-primary-600" />
						</div>
						<p class="mb-2 text-lg font-medium text-gray-900">
							{m.noTemplates()}
						</p>
						<p class="mb-4 text-gray-600">{m.createFirstTemplate()}</p>
						<Button onclick={handleCreateTemplate} color="primary"
							>{m.createTemplateButton()}</Button
						>
					</div>
				</Card>
			{/if}
		</div>
	</div>

	<!-- Recent Session -->
	<div class="mt-16">
		<div class="mb-6 flex items-center justify-between">
			<h2 class="text-2xl font-semibold text-gray-900">{m.recentHostActivity()}</h2>
			<Button color="alternative" href="/dashboard/recent/host">{m.viewAll()}</Button>
		</div>
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
		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#if $filteredHostSessions?.length}
				{#each $filteredHostSessions as [doc, session]}
					<SessionCard
						id={doc.id}
						title={session.title}
						status={session.status}
						labels={session.labels}
						task={session.task}
						createdAt={(session.createdAt as Timestamp).toDate()}
					/>
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
						<p class="mb-4 text-gray-600">{m.createSession()}</p>
					</div>
				</Card>
			{/if}
		</div>
	</div>

	<!-- Recent participant Session-->
	{#if $sessions.length}
		<div class="mt-16">
			<div class="mb-6 flex items-center justify-between">
				<h2 class="text-2xl font-semibold text-gray-900">
					{m.recentActivity()}
				</h2>
				<Button color="alternative" href="/dashboard/recent/participant">{m.viewAll()}</Button>
			</div>
			<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each $sessions as [id, session]}
					<SessionCard
						{id}
						title={session.title}
						status={session.status}
						labels={session.labels}
						task={session.task}
						host={session.host}
						createdAt={(session.createdAt as Timestamp).toDate()}
					/>
				{/each}
			</div>
		</div>
	{/if}
</main>
