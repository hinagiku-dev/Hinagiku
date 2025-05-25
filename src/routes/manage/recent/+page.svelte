<script lang="ts">
	import { onMount } from 'svelte';
	import { Card, Button, Spinner } from 'flowbite-svelte';
	import { Calendar } from 'lucide-svelte';
	import {
		collection,
		orderBy,
		query,
		where,
		Timestamp,
		getDoc,
		doc,
		getDocs
	} from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import type { Session } from '$lib/schema/session';
	import type { Class } from '$lib/schema/class';
	import { writable, derived } from 'svelte/store';
	import SessionCard from '$lib/components/SessionCard.svelte';
	import { deploymentConfig } from '$lib/config/deployment';
	import { notifications } from '$lib/stores/notifications';
	import { browser } from '$app/environment';
	import * as m from '$lib/paraglide/messages.js';

	// State variables
	let selectedClassId = $state<string | null>(null);
	let selectedClass = $state<Class | null>(null);
	let classSessions = writable<Array<[string, Session]>>([]);
	let isLoadingClassSessions = $state(false);

	// Label filtering
	let selectedLabels = writable<string[]>([]);

	let filteredClassSessions = derived(
		[classSessions, selectedLabels],
		([$classSessions, $selectedLabels]) => {
			if (!$classSessions || $selectedLabels.length === 0) return $classSessions;
			return $classSessions.filter(([, session]) =>
				$selectedLabels.every((label) => session.labels?.includes(label))
			);
		}
	);

	let availableLabels = derived(classSessions, ($classSessions) => {
		if (!$classSessions) return [];
		const labels = new Set<string>();
		$classSessions.forEach(([, session]) => {
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

	// Load selected class data
	async function loadSelectedClass(classId: string) {
		if (!classId || !browser) return;

		try {
			const classRef = doc(db, 'classes', classId);
			const classSnapshot = await getDoc(classRef);

			if (classSnapshot.exists()) {
				selectedClass = classSnapshot.data() as Class;
			}
		} catch (error) {
			console.error('Error loading class data:', error);
			notifications.error(m.failedToLoadClassData());
		}
	}

	// Load sessions for selected class
	async function loadClassSessions(classId: string) {
		if (!classId || !browser) return;

		try {
			isLoadingClassSessions = true;
			const sessionsQuery = query(
				collection(db, 'sessions'),
				where('classId', '==', classId),
				orderBy('createdAt', 'desc')
			);

			const snapshot = await getDocs(sessionsQuery);
			const sessionsData = snapshot.docs.map(
				(doc) => [doc.id, doc.data() as Session] as [string, Session]
			);

			classSessions.set(sessionsData);
		} catch (error) {
			console.error('Error loading class sessions:', error);
			notifications.error(m.failedToLoadClassSessions());
		} finally {
			isLoadingClassSessions = false;
		}
	}

	// Effects
	$effect(() => {
		if (selectedClassId) {
			loadClassSessions(selectedClassId);
			loadSelectedClass(selectedClassId);
		}
	});

	onMount(() => {
		// Check for classId in URL params
		const urlParams = new URLSearchParams(window.location.search);
		const classIdParam = urlParams.get('classId');
		if (classIdParam) {
			selectedClassId = classIdParam;
		}
	});
</script>

<svelte:head>
	<title>{m.managementDashboard()} - {m.classSessions()} | {deploymentConfig.siteTitle}</title>
</svelte:head>

<main class="mx-auto max-w-6xl px-4 py-16">
	<div class="mb-12 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">{m.classSessions()}</h1>
			{#if selectedClass}
				<p class="mt-2 text-gray-600">
					{selectedClass.className} - {selectedClass.schoolName} ({selectedClass.academicYear})
				</p>
			{/if}
		</div>
		<div class="text-right">
			<Button href="/manage" color="alternative">{m.backToManagement()}</Button>
		</div>
	</div>

	<div>
		<!-- Label Filters -->
		{#if $availableLabels.length > 0}
			<div class="mb-6">
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
			</div>
		{/if}

		<!-- Sessions Grid -->
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#if isLoadingClassSessions}
				<Card class="md:col-span-2 lg:col-span-3">
					<div class="p-8 text-center">
						<Spinner size="8" />
						<p class="mt-2 text-gray-600">{m.loadingSessions()}</p>
					</div>
				</Card>
			{:else if $filteredClassSessions?.length > 0}
				{#each $filteredClassSessions as [sessionId, session]}
					<SessionCard
						id={sessionId}
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
						<div class="mb-4 inline-flex rounded-full bg-gray-100 p-4">
							<Calendar size={32} class="text-gray-400" />
						</div>
						<p class="mb-2 text-lg font-medium text-gray-900">{m.noSessionsFound()}</p>
						<p class="mb-4 text-gray-600">
							{#if selectedClass}
								{m.classNoSessionsYet()}
							{:else}
								{m.selectClassToView()}
							{/if}
						</p>
						{#if selectedClass}
							<Button color="primary" href="/templates">{m.createSessionFromTemplate()}</Button>
						{/if}
					</div>
				</Card>
			{/if}
		</div>
	</div>
</main>
