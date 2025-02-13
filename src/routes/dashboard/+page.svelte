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

	import { language } from '$lib/stores/language'; // Import the global language store

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
			await goto(`/template/${id}`);
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

	const translations = {
		en: {
			welcome: 'Welcome to Hinagiku!',
			profile: 'Profile',
			dashboard: 'Dashboard',
			signOut: 'Sign out',
			login: 'Login',
			welcomeDashboard: 'Welcome to your dashboard',
			stats: 'Statistics',
			recentActivity: 'Recent Activity',
			createTemplate: 'Create Template',
			createTemplateDesc: 'Create a new discussion template',
			joinSession: 'Join Session',
			joinSessionDesc: 'Join an existing discussion session',
			editProfile: 'Edit Profile',
			editProfileDesc: 'Update your profile settings',
			publicTemplates: 'Public Templates',
			viewAll: 'View All',
			yourTemplates: 'Your Templates',
			noTemplates: 'No templates created yet',
			createFirstTemplate: 'Create your first template to get started',
			createTemplateButton: 'Create Your First Template',
			noSessions: 'No sessions created yet',
			createSession: 'Create a new session with template'
		},
		zh: {
			welcome: '歡迎來到Hinagiku!',
			profile: '個人資料',
			dashboard: '儀表板',
			signOut: '登出',
			login: '登入',
			welcomeDashboard: '歡迎來到您的儀表板',
			stats: '統計數據',
			recentActivity: '最近活動',
			createTemplate: '創建模板',
			createTemplateDesc: '創建一個新的討論模板',
			joinSession: '加入會話',
			joinSessionDesc: '加入現有的討論會話',
			editProfile: '編輯個人資料',
			editProfileDesc: '更新您的個人資料設置',
			publicTemplates: '公開模板',
			viewAll: '查看全部',
			yourTemplates: '您的模板',
			noTemplates: '尚未創建模板',
			createFirstTemplate: '創建您的第一個模板以開始',
			createTemplateButton: '創建您的第一個模板',
			noSessions: '尚未創建會話',
			createSession: '使用模板創建新會話'
		}
	};
</script>

<svelte:head>
	<title>Dashboard | Hinagiku</title>
</svelte:head>

<main class="mx-auto max-w-6xl px-4 py-16">
	<div class="mb-12">
		<h1 class="text-3xl font-bold text-gray-900">{translations[$language].dashboard}</h1>
		<p class="mt-2 text-gray-600">
			{translations[$language].welcomeDashboard}, {$profile?.displayName || $user?.displayName}
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
					{translations[$language].createTemplate}
				</h2>
				<p class="text-gray-600">{translations[$language].createTemplateDesc}</p>
			</button>
		</Card>

		<Card padding="xl" class="text-center transition-all hover:border-primary-500">
			<a href="/join" class="flex flex-col items-center">
				<div class="mb-4 rounded-full bg-primary-100 p-4">
					<UserPlus size={32} class="text-primary-600" />
				</div>
				<h2 class="mb-2 text-xl font-semibold text-gray-900">
					{translations[$language].joinSession}
				</h2>
				<p class="text-gray-600">{translations[$language].joinSessionDesc}</p>
			</a>
		</Card>

		<Card padding="xl" class="text-center transition-all hover:border-primary-500">
			<a href="/profile" class="flex flex-col items-center">
				<div class="mb-4 rounded-full bg-primary-100 p-4">
					<UserCog size={32} class="text-primary-600" />
				</div>
				<h2 class="mb-2 text-xl font-semibold text-gray-900">
					{translations[$language].editProfile}
				</h2>
				<p class="text-gray-600">{translations[$language].editProfileDesc}</p>
			</a>
		</Card>
	</div>

	<!-- Public Templates -->
	<div class="mb-16">
		<div class="mb-6 flex items-center justify-between">
			<h2 class="text-2xl font-semibold text-gray-900">
				{translations[$language].publicTemplates}
			</h2>
			<Button color="alternative" href="/templates/public">{translations[$language].viewAll}</Button
			>
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
								{translations[$language].createFirstTemplate}
							</p>
							<Button href="/create" class="w-full"
								>{translations[$language].createTemplateButton}</Button
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
			<h2 class="text-2xl font-semibold text-gray-900">{translations[$language].yourTemplates}</h2>
			<Button color="alternative" href="/templates">{translations[$language].viewAll}</Button>
		</div>
		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#if $templates?.length}
				{#each $templates as [doc, template]}
					<TemplateCard
						id={doc.id}
						title={template.title}
						task={template.task}
						subtaskSize={template.subtasks.length}
						resourceSize={template.resources.length}
						owner={template.owner}
						isPublic={template.public}
					/>
				{/each}
			{:else}
				<Card class="md:col-span-2 lg:col-span-3">
					<div class="p-8 text-center">
						<div class="mb-4 inline-flex rounded-full bg-primary-100 p-4">
							<MessageSquarePlus size={32} class="text-primary-600" />
						</div>
						<p class="mb-2 text-lg font-medium text-gray-900">
							{translations[$language].noTemplates}
						</p>
						<p class="mb-4 text-gray-600">{translations[$language].createFirstTemplate}</p>
						<Button onclick={handleCreateTemplate} color="primary"
							>{translations[$language].createTemplateButton}</Button
						>
					</div>
				</Card>
			{/if}
		</div>
	</div>

	<!-- Recent Session -->
	<div class="mt-16">
		<div class="mb-6 flex items-center justify-between">
			<h2 class="text-2xl font-semibold text-gray-900">{translations[$language].recentActivity}</h2>
			<Button color="alternative" href="/dashboard/recent/host"
				>{translations[$language].viewAll}</Button
			>
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
							{translations[$language].noSessions}
						</p>
						<p class="mb-4 text-gray-600">{translations[$language].createSession}</p>
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
					{translations[$language].recentActivity}
				</h2>
				<Button color="alternative" href="/dashboard/recent/participant"
					>{translations[$language].viewAll}</Button
				>
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
