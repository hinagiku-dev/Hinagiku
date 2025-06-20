<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { db } from '$lib/firebase';
	import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
	import * as m from '$lib/paraglide/messages.js';
	import type { Class } from '$lib/schema/class';
	import { getUser } from '$lib/utils/getUser';
	import Title from '$lib/components/Title.svelte';
	import WordCloud from '$lib/components/session/WordCloud.svelte';
	import { Card, Spinner, Button, Modal } from 'flowbite-svelte';
	import { ArrowLeft } from 'lucide-svelte';

	type StudentKeywordData = {
		studentId: string;
		displayName: string;
		keywords: Record<string, number>;
	};

	let classId = $state($page.params.id);
	let classData = $state<Class | null>(null);
	let studentKeywordData = $state<StudentKeywordData[]>([]);
	let isLoading = $state(true);

	// State for the modal
	let showWordCloudModal = $state(false);
	let modalStudentData = $state<StudentKeywordData | null>(null);

	function openModal(studentData: StudentKeywordData) {
		modalStudentData = studentData;
		showWordCloudModal = true;
	}

	async function loadAllStudentKeywords() {
		try {
			// 1. Fetch class data to get student list
			const classRef = doc(db, 'classes', classId);
			const classSnap = await getDoc(classRef);

			if (!classSnap.exists()) {
				console.error('Class not found');
				return;
			}
			classData = classSnap.data() as Class;
			const studentIds = classData.students;

			if (!studentIds || studentIds.length === 0) {
				studentKeywordData = [];
				return;
			}

			// 2. Fetch all sessions for the class
			const sessionsQuery = query(collection(db, 'sessions'), where('classId', '==', classId));
			const sessionsSnapshot = await getDocs(sessionsQuery);
			const sessionIds = sessionsSnapshot.docs.map((d) => d.id);

			// 3. For each student, gather all keypoints
			const allStudentsKeywords: Record<string, Record<string, number>> = {};
			studentIds.forEach((id) => (allStudentsKeywords[id] = {}));

			for (const sessionId of sessionIds) {
				const groupsQuery = query(collection(db, 'sessions', sessionId, 'groups'));
				const groupsSnapshot = await getDocs(groupsQuery);

				for (const groupDoc of groupsSnapshot.docs) {
					const conversationsQuery = query(
						collection(db, 'sessions', sessionId, 'groups', groupDoc.id, 'conversations')
					);
					const conversationsSnapshot = await getDocs(conversationsQuery);
					conversationsSnapshot.forEach((doc) => {
						const convData = doc.data();
						const userId = convData.userId;
						if (
							userId &&
							studentIds.includes(userId) &&
							convData.keyPoints &&
							Array.isArray(convData.keyPoints)
						) {
							convData.keyPoints.forEach((keyPoint: string) => {
								if (keyPoint) {
									allStudentsKeywords[userId][keyPoint] =
										(allStudentsKeywords[userId][keyPoint] || 0) + 1;
								}
							});
						}
					});
				}
			}

			// 4. Resolve display names and format data
			const resultPromises = studentIds.map(async (studentId) => {
				const user = await getUser(studentId);
				return {
					studentId,
					displayName: user.displayName,
					keywords: allStudentsKeywords[studentId]
				};
			});

			studentKeywordData = await Promise.all(resultPromises);
		} catch (error) {
			console.error('Error loading student word cloud data:', error);
			// You might want to add a user-facing notification here
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		loadAllStudentKeywords();
	});
</script>

<Title page={m.student_keyword_word_cloud_page_title()} />

<main class="px-4 py-16">
	<div class="mx-auto max-w-7xl">
		<div class="mb-8 flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold text-gray-900">
					{classData
						? m.student_keyword_word_cloud_header({ className: classData.className })
						: m.loading()}
				</h1>
				<p class="mt-2 text-gray-600">{m.student_keyword_word_cloud_description()}</p>
			</div>
			<Button href={`/manage?classId=${classId}`} color="alternative">
				<ArrowLeft class="mr-2 h-4 w-4" />
				{m.back_to_class_analysis()}
			</Button>
		</div>

		{#if isLoading}
			<div class="flex h-96 items-center justify-center">
				<Spinner size="10" />
				<p class="ml-4 text-lg text-gray-600">{m.loading_student_keywords()}</p>
			</div>
		{:else if studentKeywordData.length === 0}
			<div class="py-16 text-center">
				<p>{m.no_student_keyword_data()}</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
				{#each studentKeywordData as studentData}
					<Card
						on:click={() => openModal(studentData)}
						class="cursor-pointer transition-all hover:bg-gray-50 hover:shadow-md"
					>
						<h5 class="mb-2 text-center text-xl font-bold tracking-tight text-gray-900">
							{studentData.displayName}
						</h5>
						<div class="h-64">
							{#if Object.keys(studentData.keywords).length > 0}
								<WordCloud words={studentData.keywords} minFontSize={10} maxFontSize={32} />
							{:else}
								<div class="flex h-full items-center justify-center text-gray-500">
									<p>{m.no_keywords_found()}</p>
								</div>
							{/if}
						</div>
					</Card>
				{/each}
			</div>
		{/if}
	</div>
</main>

{#if modalStudentData}
	<Modal bind:open={showWordCloudModal} size="xl" on:close={() => (modalStudentData = null)}>
		<div class="flex items-center justify-between rounded-t border-b p-4">
			<h3 class="text-xl font-semibold text-gray-900">
				{m.student_keyword_word_cloud_modal_title({ displayName: modalStudentData.displayName })}
			</h3>
		</div>
		<div class="p-6">
			<div class="h-[500px] w-full">
				{#if Object.keys(modalStudentData.keywords).length > 0}
					<WordCloud words={modalStudentData.keywords} minFontSize={16} maxFontSize={80} />
				{:else}
					<div class="flex h-full items-center justify-center text-gray-500">
						<p>{m.no_keywords_found()}</p>
					</div>
				{/if}
			</div>
		</div>
	</Modal>
{/if}
