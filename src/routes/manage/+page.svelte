<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { Card, Button, Select, Alert, Spinner, Input, Label, Modal } from 'flowbite-svelte';
	import { Users, Calendar, UserPlus, Info, X, Check, Trash2, Edit } from 'lucide-svelte';
	import Title from '$lib/components/Title.svelte';
	import SessionCard from '$lib/components/SessionCard.svelte';
	import ResolveUsername from '$lib/components/ResolveUsername.svelte';
	import QRCode from '$lib/components/QRCode.svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
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

	// Create new class form states
	let showCreateForm = $state(false);
	let isCreatingClass = $state(false);
	let newClassData = $state({
		schoolName: '',
		academicYear: '',
		className: ''
	});

	// Edit class form states
	let showEditModal = $state(false);
	let isEditingClass = $state(false);
	let isDeletingClass = $state(false);
	let editClassData = $state({
		schoolName: '',
		academicYear: '',
		className: ''
	});
	let showDeleteConfirm = $state(false);

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

	// Effect to handle URL parameter for pre-selecting class
	$effect(() => {
		if (browser && classes.length > 0 && !selectedClassId) {
			const urlClassId = $page.url.searchParams.get('classId');
			if (urlClassId && classes.some((c) => c.id === urlClassId)) {
				selectedClassId = urlClassId;
			}
		}
	});

	// Effect to update URL when class selection changes
	$effect(() => {
		if (browser && selectedClassId && hasInitialized) {
			const currentUrl = new URL($page.url);
			if (currentUrl.searchParams.get('classId') !== selectedClassId) {
				currentUrl.searchParams.set('classId', selectedClassId);
				goto(currentUrl.toString(), { replaceState: true });
			}
		} else if (browser && selectedClassId === null && hasInitialized) {
			const currentUrl = new URL($page.url);
			if (currentUrl.searchParams.has('classId')) {
				currentUrl.searchParams.delete('classId');
				goto(currentUrl.toString(), { replaceState: true });
			}
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

	// Create new class
	async function createNewClass() {
		if (!$user || !browser) return;

		// Validate form data
		if (
			!newClassData.schoolName.trim() ||
			!newClassData.academicYear.trim() ||
			!newClassData.className.trim()
		) {
			notifications.error(m.createClassRequiredFields());
			return;
		}

		try {
			isCreatingClass = true;

			const response = await fetch('/api/class/create', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					schoolName: newClassData.schoolName.trim(),
					academicYear: newClassData.academicYear.trim(),
					className: newClassData.className.trim()
				})
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || m.createClassFailed());
			}

			// Add to local classes array
			const newClass = {
				id: result.classId,
				data: result.classData as Class
			};

			classes = [newClass, ...classes].sort((a, b) => {
				if (a.data.academicYear !== b.data.academicYear) {
					return b.data.academicYear.localeCompare(a.data.academicYear);
				}
				return a.data.className.localeCompare(b.data.className);
			});

			// Select the new class
			selectedClassId = result.classId;

			// Reset form and hide it
			newClassData = { schoolName: '', academicYear: '', className: '' };
			showCreateForm = false;

			notifications.success(m.createClassSuccess());
		} catch (error) {
			console.error('Error creating class:', error);
			notifications.error(error instanceof Error ? error.message : m.createClassFailed());
		} finally {
			isCreatingClass = false;
		}
	}

	// Cancel create form
	function cancelCreateForm() {
		newClassData = { schoolName: '', academicYear: '', className: '' };
		showCreateForm = false;
	}

	// Open edit modal
	function openEditModal() {
		if (!selectedClass) return;
		editClassData = {
			schoolName: selectedClass.schoolName,
			academicYear: selectedClass.academicYear,
			className: selectedClass.className
		};
		showEditModal = true;
		showDeleteConfirm = false;
	}

	// Cancel edit modal
	function cancelEditModal() {
		editClassData = { schoolName: '', academicYear: '', className: '' };
		showEditModal = false;
		showDeleteConfirm = false;
	}

	// Update class
	async function updateClass() {
		if (!selectedClassId || !selectedClass || !$user || !browser) return;

		// Validate form data
		if (
			!editClassData.schoolName.trim() ||
			!editClassData.academicYear.trim() ||
			!editClassData.className.trim()
		) {
			notifications.error(m.createClassRequiredFields());
			return;
		}

		try {
			isEditingClass = true;

			const response = await fetch(`/api/class/${selectedClassId}/action/update`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					schoolName: editClassData.schoolName.trim(),
					academicYear: editClassData.academicYear.trim(),
					className: editClassData.className.trim()
				})
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || m.updateClassFailed());
			}

			// Update local classes array
			classes = classes.map((classItem) => {
				if (classItem.id === selectedClassId) {
					return {
						...classItem,
						data: {
							...classItem.data,
							schoolName: editClassData.schoolName.trim(),
							academicYear: editClassData.academicYear.trim(),
							className: editClassData.className.trim()
						}
					};
				}
				return classItem;
			});

			// Update selected class
			if (selectedClass) {
				selectedClass = {
					...selectedClass,
					schoolName: editClassData.schoolName.trim(),
					academicYear: editClassData.academicYear.trim(),
					className: editClassData.className.trim()
				};
			}

			// Sort classes again
			classes = classes.sort((a, b) => {
				if (a.data.academicYear !== b.data.academicYear) {
					return b.data.academicYear.localeCompare(a.data.academicYear);
				}
				return a.data.className.localeCompare(b.data.className);
			});

			cancelEditModal();
			notifications.success(m.updateClassSuccess());
		} catch (error) {
			console.error('Error updating class:', error);
			notifications.error(error instanceof Error ? error.message : m.updateClassFailed());
		} finally {
			isEditingClass = false;
		}
	}

	async function archiveClass() {
		if (!selectedClassId || !$user || !browser) return;

		try {
			isEditingClass = true;

			const response = await fetch(`/api/class/${selectedClassId}/action/archive`, {
				method: 'POST'
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || m.archiveClassFailed());
			}

			loadClasses();

			// Reset selection
			selectedClassId = null;
			selectedClass = null;

			cancelEditModal();
			notifications.success(m.archiveClassSuccess());
		} catch (error) {
			console.error('Error archiving class:', error);
			notifications.error(error instanceof Error ? error.message : m.archiveClassFailed());
		} finally {
			isEditingClass = false;
		}
	}

	async function UnarchiveClass() {
		if (!selectedClassId || !$user || !browser) return;

		try {
			isEditingClass = true;

			const response = await fetch(`/api/class/${selectedClassId}/action/unarchive`, {
				method: 'POST'
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || m.unarchiveClassFailed());
			}

			loadClasses();

			// Reset selection
			selectedClassId = null;
			selectedClass = null;

			cancelEditModal();
			notifications.success(m.unarchiveClassSuccess());
		} catch (error) {
			console.error('Error archiving class:', error);
			notifications.error(error instanceof Error ? error.message : m.unarchiveClassFailed());
		} finally {
			isEditingClass = false;
		}
	}

	// Delete class
	async function deleteClass() {
		if (!selectedClassId || !$user || !browser) return;

		try {
			isDeletingClass = true;

			const response = await fetch(`/api/class/${selectedClassId}/action/delete`, {
				method: 'POST'
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || m.deleteClassFailed());
			}

			// Remove from local classes array
			classes = classes.filter((classItem) => classItem.id !== selectedClassId);

			// Reset selection
			selectedClassId = null;
			selectedClass = null;

			cancelEditModal();
			notifications.success(m.deleteClassSuccess());
		} catch (error) {
			console.error('Error deleting class:', error);
			notifications.error(error instanceof Error ? error.message : m.deleteClassFailed());
		} finally {
			isDeletingClass = false;
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
							{#if classItem.data.active_status === 'active'}
								<option value={classItem.id}>
									{classItem.data.className} - {classItem.data.schoolName} ({classItem.data
										.academicYear})
								</option>
							{/if}
						{/each}
						<option disabled value={null} style="color: gray;">
							--- {m.archived()} ---
						</option>
						{#each classes as classItem}
							{#if classItem.data.active_status === 'archived'}
								<option value={classItem.id} style="color: gray;">
									{classItem.data.className} - {classItem.data.schoolName} ({classItem.data
										.academicYear})
								</option>
							{/if}
						{/each}
					</Select>

					{#if !showCreateForm}
						<div class="mt-4">
							<Button
								color="primary"
								size="sm"
								class="w-full"
								on:click={() => (showCreateForm = true)}
							>
								<UserPlus class="mr-2 h-4 w-4" />
								{m.createNewClass()}
							</Button>
						</div>
					{:else}
						<!-- Create New Class Form -->
						<div class="mt-4 space-y-4 rounded-lg border border-primary-200 bg-primary-50 p-4">
							<div class="flex items-center justify-between">
								<h4 class="font-semibold text-primary-900">{m.createNewClass()}</h4>
								<Button
									color="alternative"
									size="xs"
									on:click={cancelCreateForm}
									disabled={isCreatingClass}
								>
									<X class="h-3 w-3" />
								</Button>
							</div>

							<div class="space-y-3">
								<div>
									<Label for="schoolName" class="mb-1 text-sm font-medium text-gray-700">
										{m.school()} *
									</Label>
									<Input
										id="schoolName"
										bind:value={newClassData.schoolName}
										placeholder={m.schoolNamePlaceholder()}
										disabled={isCreatingClass}
										class="text-sm"
									/>
								</div>

								<div>
									<Label for="academicYear" class="mb-1 text-sm font-medium text-gray-700">
										{m.academicYear()} *
									</Label>
									<Input
										id="academicYear"
										bind:value={newClassData.academicYear}
										placeholder={m.academicYearPlaceholder()}
										disabled={isCreatingClass}
										class="text-sm"
									/>
								</div>

								<div>
									<Label for="className" class="mb-1 text-sm font-medium text-gray-700">
										{m.className()} *
									</Label>
									<Input
										id="className"
										bind:value={newClassData.className}
										placeholder={m.classNamePlaceholder()}
										disabled={isCreatingClass}
										class="text-sm"
									/>
								</div>
							</div>

							<div class="flex gap-2">
								<Button
									color="primary"
									size="sm"
									class="flex-1"
									on:click={createNewClass}
									disabled={isCreatingClass}
								>
									{#if isCreatingClass}
										<Spinner size="4" class="mr-2" />
									{:else}
										<Check class="mr-2 h-4 w-4" />
									{/if}
									{m.createClassButton()}
								</Button>
								<Button
									color="alternative"
									size="sm"
									on:click={cancelCreateForm}
									disabled={isCreatingClass}
								>
									{m.cancel()}
								</Button>
							</div>
						</div>
					{/if}
				{:else}
					<Alert class="mb-4">
						<span class="font-medium">{m.noClassesFound()}</span>
						{m.needCreateClassFirst()}
					</Alert>

					{#if !showCreateForm}
						<Button color="primary" class="w-full" on:click={() => (showCreateForm = true)}>
							<UserPlus class="mr-2 h-4 w-4" />
							{m.createYourFirstClass()}
						</Button>
					{:else}
						<!-- Create First Class Form -->
						<div class="space-y-4 rounded-lg border border-primary-200 bg-primary-50 p-4">
							<div class="flex items-center justify-between">
								<h4 class="font-semibold text-primary-900">{m.createYourFirstClass()}</h4>
								<Button
									color="alternative"
									size="xs"
									on:click={cancelCreateForm}
									disabled={isCreatingClass}
								>
									<X class="h-3 w-3" />
								</Button>
							</div>

							<div class="space-y-3">
								<div>
									<Label for="schoolName" class="mb-1 text-sm font-medium text-gray-700">
										{m.school()} *
									</Label>
									<Input
										id="schoolName"
										bind:value={newClassData.schoolName}
										placeholder={m.schoolNamePlaceholder()}
										disabled={isCreatingClass}
										class="text-sm"
									/>
								</div>

								<div>
									<Label for="academicYear" class="mb-1 text-sm font-medium text-gray-700">
										{m.academicYear()} *
									</Label>
									<Input
										id="academicYear"
										bind:value={newClassData.academicYear}
										placeholder={m.academicYearPlaceholder()}
										disabled={isCreatingClass}
										class="text-sm"
									/>
								</div>

								<div>
									<Label for="className" class="mb-1 text-sm font-medium text-gray-700">
										{m.className()} *
									</Label>
									<Input
										id="className"
										bind:value={newClassData.className}
										placeholder={m.classNamePlaceholder()}
										disabled={isCreatingClass}
										class="text-sm"
									/>
								</div>
							</div>

							<div class="flex gap-2">
								<Button
									color="primary"
									size="sm"
									class="flex-1"
									on:click={createNewClass}
									disabled={isCreatingClass}
								>
									{#if isCreatingClass}
										<Spinner size="4" class="mr-2" />
									{:else}
										<Check class="mr-2 h-4 w-4" />
									{/if}
									{m.createClassButton()}
								</Button>
								<Button
									color="alternative"
									size="sm"
									on:click={cancelCreateForm}
									disabled={isCreatingClass}
								>
									{m.cancel()}
								</Button>
							</div>
						</div>
					{/if}
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

					<!-- QR Code and Class Code Section -->
					<div class="flex flex-col items-center space-y-4">
						<h4 class="text-lg font-semibold text-gray-900">{m.qrcodeClassAccess()}</h4>
						<QRCode value={`${origin}/login?classCode=${selectedClass.code}`} />
						<p class="text-lg font-bold">{m.classCodeTitle()}: {selectedClass.code}</p>
					</div>

					<hr class="my-4" />

					<!-- Class Actions -->
					<h4 class="mb-3 font-semibold text-gray-900">{m.actions()}</h4>
					<div class="flex flex-col gap-2">
						<Button color="primary" size="sm" on:click={openEditModal}>
							<Edit class="mr-2 h-4 w-4" />
							{m.editClass()}
						</Button>
						<Button color="alternative" size="sm" href="/manage/{selectedClassId}/credential">
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
									<Button color="alternative" href="/manage/{selectedClassId}/recent">
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

<!-- Edit Class Modal -->
<Modal bind:open={showEditModal} size="md" autoclose={false} class="w-full">
	<div class="flex items-center justify-between rounded-t border-b p-4">
		<h3 class="text-xl font-semibold text-gray-900">
			{#if showDeleteConfirm}
				{m.confirmDeleteClass()}
			{:else}
				{m.editClassInformation()}
			{/if}
		</h3>
	</div>

	<div class="space-y-6 p-6">
		{#if showDeleteConfirm}
			<!-- Delete Confirmation -->
			<div class="text-center">
				<div class="mb-4 inline-flex rounded-full bg-red-100 p-4">
					<Trash2 size={32} class="text-red-600" />
				</div>
				<h4 class="mb-2 text-lg font-semibold text-gray-900">{m.confirmDeleteClassTitle()}</h4>
				<p class="mb-4 text-gray-600">
					{m.confirmDeleteClassMessage()} 「{selectedClass?.className} - {selectedClass?.schoolName}」{m.confirmDeleteClassWarning()}
				</p>
				<div class="flex justify-center gap-4">
					<Button color="red" on:click={deleteClass} disabled={isDeletingClass}>
						{#if isDeletingClass}
							<Spinner size="4" class="mr-2" />
						{:else}
							<Trash2 class="mr-2 h-4 w-4" />
						{/if}
						{m.confirmDelete()}
					</Button>
					<Button
						color="alternative"
						on:click={() => (showDeleteConfirm = false)}
						disabled={isDeletingClass}
					>
						{m.cancel()}
					</Button>
				</div>
			</div>
		{:else}
			<!-- Edit Form -->
			<div class="space-y-4">
				<div>
					<Label for="editSchoolName" class="mb-2 text-sm font-medium text-gray-700">
						{m.school()} *
					</Label>
					<Input
						id="editSchoolName"
						bind:value={editClassData.schoolName}
						placeholder={m.schoolNamePlaceholder()}
						disabled={isEditingClass}
					/>
				</div>

				<div>
					<Label for="editAcademicYear" class="mb-2 text-sm font-medium text-gray-700">
						{m.academicYear()} *
					</Label>
					<Input
						id="editAcademicYear"
						bind:value={editClassData.academicYear}
						placeholder={m.academicYearPlaceholder()}
						disabled={isEditingClass}
					/>
				</div>

				<div>
					<Label for="editClassName" class="mb-2 text-sm font-medium text-gray-700">
						{m.className()} *
					</Label>
					<Input
						id="editClassName"
						bind:value={editClassData.className}
						placeholder={m.classNamePlaceholder()}
						disabled={isEditingClass}
					/>
				</div>
			</div>

			<!-- Action Buttons -->
			<div class="flex justify-between">
				<div class="flex gap-2">
					<Button
						color="red"
						outline
						on:click={() => (showDeleteConfirm = true)}
						disabled={isEditingClass}
					>
						<Trash2 class="h-4 w-4" />
						{m.deleteClass()}
					</Button>
					{#if selectedClass?.active_status === 'active'}
						<Button color="light" outline on:click={() => archiveClass()} disabled={isEditingClass}>
							<Trash2 class="ml-0 h-4 w-4" />
							{m.archiveClass()}
						</Button>
					{:else}
						<Button
							color="light"
							outline
							on:click={() => UnarchiveClass()}
							disabled={isEditingClass}
						>
							<Trash2 class="ml-0 h-4 w-4" />
							{m.unarchiveClass()}
						</Button>
					{/if}
				</div>

				<div class="flex gap-2">
					<Button color="alternative" on:click={cancelEditModal} disabled={isEditingClass}>
						{m.cancel()}
					</Button>
					<Button color="primary" on:click={updateClass} disabled={isEditingClass}>
						{#if isEditingClass}
							<Spinner size="4" class="mr-2" />
						{:else}
							<Check class="mr-2 h-4 w-4" />
						{/if}
						{m.saveChangesButton()}
					</Button>
				</div>
			</div>
		{/if}
	</div>
</Modal>

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
