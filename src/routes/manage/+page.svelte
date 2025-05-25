<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { Card, Button, Select, Alert, Spinner } from 'flowbite-svelte';
	import { Users, Calendar, Settings, UserPlus, Info } from 'lucide-svelte';
	import Title from '$lib/components/Title.svelte';
	import SessionCard from '$lib/components/SessionCard.svelte';
	import ResolveUsername from '$lib/components/ResolveUsername.svelte';
	import { browser } from '$app/environment';
	import { user } from '$lib/stores/auth';
	import { UI_CLASSES } from '$lib/config/ui';
	import { writable, derived } from 'svelte/store';
	import {
		collection,
		query,
		where,
		orderBy,
		getDocs,
		getDoc,
		doc,
		Timestamp
	} from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import type { Class } from '$lib/schema/class';
	import type { Session } from '$lib/schema/session';
	import { notifications } from '$lib/stores/notifications';

	// State variables using runes
	let classes = $state<Array<{ id: string; data: Class }>>([]);
	let selectedClassId = $state<string | null>(null);
	let selectedClass = $state<Class | null>(null);

	// Loading states
	let isLoadingClasses = $state(false);
	let isLoadingClassSessions = $state(false);
	let hasInitialized = $state(false);

	// Label filtering
	let selectedLabels = writable<string[]>([]);
	let classSessionsStore = writable<Array<[string, Session]>>([]);

	let filteredClassSessions = derived(
		[classSessionsStore, selectedLabels],
		([$classSessionsStore, $selectedLabels]) => {
			if (!$classSessionsStore || $selectedLabels.length === 0) return $classSessionsStore;
			return $classSessionsStore.filter(([, session]) =>
				$selectedLabels.every((label) => session.labels?.includes(label))
			);
		}
	);

	let availableLabels = derived(classSessionsStore, ($classSessionsStore) => {
		if (!$classSessionsStore) return [];
		const labels = new Set<string>();
		$classSessionsStore.forEach(([, session]) => {
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

	// Reactive effect
	$effect(() => {
		if (selectedClassId) {
			loadClassSessions(selectedClassId);
			loadSelectedClass(selectedClassId);
		}
	});

	// Effect to load classes when user is available
	$effect(() => {
		if ($user && browser && !hasInitialized && !isLoadingClasses) {
			loadClasses();
		}
	});

	// Load user's classes
	async function loadClasses() {
		if (!$user || !browser) return;

		try {
			isLoadingClasses = true;
			const classesQuery = query(collection(db, 'classes'), where('teacherId', '==', $user.uid));

			const snapshot = await getDocs(classesQuery);
			const classesData = snapshot.docs.map((doc) => ({
				id: doc.id,
				data: doc.data() as Class
			}));

			// Sort by academicYear (descending) then by className (ascending)
			classes = classesData.sort((a, b) => {
				// First sort by academicYear (descending)
				if (a.data.academicYear !== b.data.academicYear) {
					return b.data.academicYear.localeCompare(a.data.academicYear);
				}
				// Then sort by className (ascending)
				return a.data.className.localeCompare(b.data.className);
			});
		} catch (error) {
			console.error('Error loading classes:', error);
			notifications.error(m.failedToLoadClasses());
		} finally {
			isLoadingClasses = false;
			hasInitialized = true;
		}
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

			classSessionsStore.set(sessionsData);
		} catch (error) {
			console.error('Error loading class sessions:', error);
			notifications.error(m.failedToLoadClassSessions());
		} finally {
			isLoadingClassSessions = false;
		}
	}
</script>

<Title page={m.managementDashboard()} />

<main class="px-4 py-16">
	<div class="mx-auto mb-8 max-w-6xl">
		<div class="flex items-center justify-between">
			<div class="flex-1 text-center">
				<h1 class="text-3xl font-bold text-gray-900">{m.managementDashboard()}</h1>
				<p class="mt-2 text-gray-600">{m.manageClassesDesc()}</p>
			</div>
			<div class="flex-shrink-0">
				<Button href="/dashboard" color="alternative">
					{m.backToDashboard()}
				</Button>
			</div>
		</div>
	</div>

	<!-- Main Layout: Left 1/4, Right 3/4 -->
	<div class="grid min-h-screen grid-cols-1 gap-2 lg:grid-cols-4">
		<!-- Left Column - Class Selection & Information (1/4 width) -->
		<div class="space-y-2 px-4 lg:col-span-1">
			<!-- Class Selection -->
			<Card padding="lg" class="w-full !max-w-none">
				<div class="mb-4">
					<div class="mb-3 flex items-center gap-3">
						<div class="rounded-full bg-primary-100 p-2">
							<Users size={20} class="text-primary-600" />
						</div>
						<h2 class="text-lg font-semibold text-gray-900">{m.selectClass()}</h2>
					</div>
					<p class="mb-4 text-sm text-gray-600">{m.chooseClassToManage()}</p>
				</div>

				{#if isLoadingClasses}
					<div class="flex justify-center">
						<Spinner size="6" />
					</div>
				{:else if !hasInitialized}
					<div class="text-center text-gray-500">{m.initializing()}</div>
				{:else if classes.length > 0}
					<Select
						bind:value={selectedClassId}
						placeholder="{m.chooseClassToManage()}..."
						class="w-full"
					>
						<option value={null}>{m.selectClass()}</option>
						{#each classes as classItem}
							<option value={classItem.id}>
								{classItem.data.className} - {classItem.data.schoolName} ({classItem.data
									.academicYear})
							</option>
						{/each}
					</Select>

					<div class="mt-4">
						<Button color="primary" size="sm" href="/classes/create" class="w-full">
							<UserPlus class="mr-2 h-4 w-4" />
							{m.createNewClass()}
						</Button>
					</div>
				{:else}
					<Alert class="mb-4">
						<span class="font-medium">{m.noClassesFound()}</span>
						{m.needCreateClassFirst()}
					</Alert>

					<Button color="primary" href="/classes/create" class="w-full">
						<UserPlus class="mr-2 h-4 w-4" />
						{m.createYourFirstClass()}
					</Button>
				{/if}
			</Card>

			<!-- Class Information -->
			{#if selectedClassId && selectedClass}
				<Card padding="lg" class="w-full !max-w-none">
					<div class="mb-4">
						<div class="mb-3 flex items-center gap-3">
							<div class="rounded-full bg-primary-100 p-2">
								<Info size={20} class="text-primary-600" />
							</div>
							<h3 class="text-lg font-semibold text-gray-900">{m.classInformation()}</h3>
						</div>
					</div>
					<div class="space-y-3">
						<p><span class="font-medium">{m.classCode()}:</span> {selectedClass.code}</p>
						<p><span class="font-medium">{m.school()}:</span> {selectedClass.schoolName}</p>
						<p><span class="font-medium">{m.academicYear()}:</span> {selectedClass.academicYear}</p>
						<p><span class="font-medium">{m.students()}:</span> {selectedClass.students.length}</p>
						<p><span class="font-medium">{m.groups()}:</span> {selectedClass.groups.length}</p>
					</div>

					<hr class="my-4" />

					<!-- Class Actions -->
					<h4 class="mb-3 font-semibold text-gray-900">{m.actions()}</h4>
					<div class="flex flex-col gap-2">
						<Button color="primary" size="sm" href="/classes/{selectedClassId}">
							<Settings class="mr-2 h-4 w-4" />
							{m.editClass()}
						</Button>
						<Button color="alternative" size="sm" href="/classes/{selectedClassId}/students">
							<UserPlus class="mr-2 h-4 w-4" />
							{m.manageStudents()}
						</Button>
					</div>
				</Card>
			{/if}
		</div>

		<!-- Right Column - Groups and Sessions (3/4 width) -->
		<div class="w-full px-4 lg:col-span-3">
			{#if selectedClassId && selectedClass}
				<div class="w-full space-y-6">
					<!-- Class Groups -->
					{#if selectedClass.groups.length > 0}
						<Card padding="lg" class="w-full !max-w-none">
							<div class="mb-4">
								<div class="mb-3 flex items-center gap-3">
									<div class="rounded-full bg-primary-100 p-2">
										<Users size={20} class="text-primary-600" />
									</div>
									<h3 class="text-lg font-semibold text-gray-900">{m.defaultGroups()}</h3>
								</div>
							</div>
							<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
								{#each selectedClass.groups.sort((a, b) => a.number - b.number) as group}
									<div class="rounded border p-3 {UI_CLASSES.PANEL_BG} shadow-sm">
										<div class="mb-2 flex items-center justify-between">
											<span class="text-sm font-semibold"
												>{m.groupVocabulary()} #{group.number}</span
											>
											<span
												class="rounded-full bg-primary-100 px-2 py-0.5 text-xs text-primary-600"
											>
												{group.students.length}
												{m.studentsLowercase()}
											</span>
										</div>

										{#if group.students.length === 0}
											<p class="text-xs text-gray-500">{m.noStudentsAssigned()}</p>
										{:else}
											<ul class="space-y-1.5">
												{#each group.students as studentId}
													<li>
														<div class="flex items-center gap-1.5">
															<span class="truncate text-xs">
																<ResolveUsername id={studentId} />
															</span>
														</div>
													</li>
												{/each}
											</ul>
										{/if}
									</div>
								{/each}
							</div>
						</Card>
					{:else}
						<Alert>
							<span class="font-medium">{m.noGroupsConfigured()}</span>
							{m.classNoPredefinedGroups()}
						</Alert>
					{/if}

					<!-- Class Sessions -->
					<Card padding="lg" class="w-full !max-w-none">
						<div class="mb-4 flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div class="rounded-full bg-primary-100 p-2">
									<Calendar size={20} class="text-primary-600" />
								</div>
								<h3 class="text-lg font-semibold text-gray-900">{m.classSessions()}</h3>
							</div>

							<div class="flex items-center gap-2">
								{#if isLoadingClassSessions}
									<Spinner size="4" />
								{/if}
								{#if selectedClassId}
									<Button color="alternative" href="/manage/recent?classId={selectedClassId}">
										{m.viewAll()}
									</Button>
								{/if}
							</div>
						</div>

						{#if $availableLabels.length > 0}
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
						{/if}

						{#if isLoadingClassSessions}
							<div class="text-center">
								<Spinner size="8" />
								<p class="mt-2 text-gray-600">{m.loadingSessions()}</p>
							</div>
						{:else if $filteredClassSessions?.length > 0}
							<div
								class="session-grid grid w-full gap-4"
								style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));"
							>
								{#each $filteredClassSessions as [sessionId, session]}
									<div class="w-full !max-w-none">
										<SessionCard
											id={sessionId}
											title={session.title}
											status={session.status}
											labels={session.labels}
											task={session.task}
											createdAt={(session.createdAt as Timestamp).toDate()}
										/>
									</div>
								{/each}
							</div>
						{:else}
							<div class="py-8 text-center">
								<div class="mb-4 inline-flex rounded-full bg-gray-100 p-4">
									<Calendar size={32} class="text-gray-400" />
								</div>
								<p class="mb-2 text-lg font-medium text-gray-900">{m.noSessionsFound()}</p>
								<p class="mb-4 text-gray-600">{m.classNoSessionsYet()}</p>
								<Button color="primary" href="/templates">{m.createSessionFromTemplate()}</Button>
							</div>
						{/if}
					</Card>
				</div>
			{:else}
				<div class="flex h-64 w-full items-center justify-center">
					<div class="text-center">
						<div class="mb-4 inline-flex rounded-full bg-gray-100 p-6">
							<Users size={48} class="text-gray-400" />
						</div>
						<p class="text-lg font-medium text-gray-900">{m.selectClass()}</p>
						<p class="text-gray-600">
							{m.chooseClassToViewSessions()}
						</p>
					</div>
				</div>
			{/if}
		</div>
	</div>
</main>

<style>
	/* Force override any max-width restrictions */
	:global(.session-grid .w-full) {
		max-width: none !important;
		width: 100% !important;
	}

	:global(.session-grid) {
		width: 100% !important;
	}
</style>
