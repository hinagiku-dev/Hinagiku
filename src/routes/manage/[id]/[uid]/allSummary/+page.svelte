<script lang="ts">
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import {
		collection,
		query,
		where,
		orderBy,
		getDocs,
		doc,
		getDoc,
		Timestamp
	} from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import { Card, Spinner, Alert, Button, Modal } from 'flowbite-svelte';
	import { Calendar, Info, ArrowLeft } from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages.js';
	import Title from '$lib/components/Title.svelte';
	import { getUser } from '$lib/utils/getUser';
	import type { Session } from '$lib/schema/session';
	import type { Conversation } from '$lib/schema/conversation';
	import { notifications } from '$lib/stores/notifications';
	import EndedView from '$lib/components/session/EndedView.svelte';
	import type { Group } from '$lib/schema/group';

	type Summary = {
		sessionTitle: string;
		summary: string;
		reflectionQuestion: string | undefined;
		reflection: string | undefined;
		keywords: string[] | undefined;
		createdAt: Date;
		sessionId: string;
		conversationId: string;
	};

	let studentName = $state('');
	let summaries = $state<Summary[]>([]);
	let isLoading = $state(true);
	let classId = $state('');
	let studentId = $state('');
	let showModal = $state(false);
	let selectedConversation = $state<{ data: Conversation; id: string } | null>(null);
	let selectedGroup = $state<{ data: Group; id: string } | null>(null);

	$effect(() => {
		if ($page.params.id && $page.params.uid) {
			classId = $page.params.id;
			studentId = $page.params.uid;
		}
	});

	$effect(() => {
		if (browser && classId && studentId) {
			loadSummaries();
			loadStudentName();
		}
	});

	async function loadStudentName() {
		try {
			const user = await getUser(studentId);
			studentName = user.displayName;
		} catch (error) {
			console.error('Error loading student name:', error);
			studentName = studentId; // Fallback
		}
	}

	async function loadSummaries() {
		isLoading = true;
		try {
			const sessionsQuery = query(
				collection(db, 'sessions'),
				where('classId', '==', classId),
				orderBy('createdAt', 'desc')
			);
			const sessionsSnapshot = await getDocs(sessionsQuery);

			const allSummaries: Summary[] = [];

			for (const sessionDoc of sessionsSnapshot.docs) {
				const sessionData = sessionDoc.data() as Session;
				const groupsQuery = query(collection(db, 'sessions', sessionDoc.id, 'groups'));
				const groupsSnapshot = await getDocs(groupsQuery);

				for (const groupDoc of groupsSnapshot.docs) {
					const conversationsQuery = query(
						collection(db, 'sessions', sessionDoc.id, 'groups', groupDoc.id, 'conversations'),
						where('userId', '==', studentId)
					);
					const conversationsSnapshot = await getDocs(conversationsQuery);

					conversationsSnapshot.forEach((convDoc) => {
						const convData = convDoc.data() as Conversation;
						if (convData.summary) {
							allSummaries.push({
								sessionTitle: sessionData.title,
								summary: convData.summary,
								reflectionQuestion: sessionData.reflectionQuestion,
								reflection: undefined,
								keywords: convData.keyPoints ?? [],
								createdAt: (sessionData.createdAt as Timestamp).toDate(),
								sessionId: sessionDoc.id,
								conversationId: convDoc.id
							});
						}
					});
				}
			}
			summaries = allSummaries;
		} catch (error) {
			console.error('Error loading summaries:', error);
			notifications.error(m.failedToLoadData());
		} finally {
			isLoading = false;
		}
	}

	async function handleSessionClick(sessionId: string, conversationId: string) {
		try {
			// Get conversation data
			const groupsQuery = query(collection(db, 'sessions', sessionId, 'groups'));
			const groupsSnapshot = await getDocs(groupsQuery);

			for (const groupDoc of groupsSnapshot.docs) {
				const convRef = doc(
					db,
					'sessions',
					sessionId,
					'groups',
					groupDoc.id,
					'conversations',
					conversationId
				);
				const convSnap = await getDoc(convRef);

				if (convSnap.exists()) {
					selectedConversation = {
						data: convSnap.data() as Conversation,
						id: convSnap.id
					};
					selectedGroup = {
						data: groupDoc.data() as Group,
						id: groupDoc.id
					};
					showModal = true;
					break;
				}
			}
		} catch (error) {
			console.error('Error loading conversation:', error);
			notifications.error(m.failedToLoadData());
		}
	}
</script>

<Title page={studentName ? `${studentName} - ${m.sessionSummaries()}` : m.sessionSummaries()} />

<main class="px-8 py-16 lg:px-16">
	<div class="w-full">
		<div class="mx-auto mb-8 flex max-w-4xl items-center justify-between">
			<div class="flex-grow text-center">
				<h1 class="text-3xl font-bold text-gray-900">
					{studentName}
				</h1>
				<p class="mt-2 text-gray-600">{m.sessionSummaries()}</p>
			</div>
			<Button href={`/manage?classId=${classId}`} color="alternative">
				<ArrowLeft class="mr-2 h-4 w-4" />
				{m.backToClassAnalysis()}
			</Button>
		</div>

		{#if isLoading}
			<div class="flex flex-col items-center justify-center py-16">
				<Spinner size="8" />
				<p class="mt-4 text-gray-600">{m.loading()}</p>
			</div>
		{:else if summaries.length > 0}
			<div class="mx-auto max-w-[1200px] space-y-6">
				{#each summaries as item (item.conversationId)}
					<Card class="w-full !max-w-none">
						<div class="flex items-center justify-between">
							<button
								class="text-xl font-semibold text-primary-700 hover:text-primary-800 hover:underline"
								onclick={() => handleSessionClick(item.sessionId, item.conversationId)}
							>
								{item.sessionTitle}
							</button>
							<div class="flex items-center text-sm text-gray-500">
								<Calendar class="mr-2 h-4 w-4" />
								{item.createdAt.toLocaleDateString()}
							</div>
						</div>
						<hr class="my-3" />
						<div class="prose prose-sm max-w-none dark:prose-invert">
							<h3 class="font-semibold">{m.summary()}</h3>
							<p>{item.summary}</p>

							{#if item.keywords && item.keywords.length > 0}
								<h3 class="mt-4 font-semibold">{m.keywords()}</h3>
								<div class="flex flex-wrap gap-2">
									{#each item.keywords as keyword}
										<span
											class="rounded-full bg-primary-100 px-3 py-1 text-xs font-medium text-primary-800"
										>
											{keyword}
										</span>
									{/each}
								</div>
							{/if}

							{#if item.reflectionQuestion}
								<h3 class="mt-4 font-semibold">{m.reflectionQuestion()}</h3>
								<p class="font-bold">{item.reflectionQuestion}</p>
								{#if item.reflection}
									<p>{item.reflection}</p>
								{:else}
									<p class="text-gray-500">({m.notAnswered()})</p>
								{/if}
							{/if}
						</div>
					</Card>
				{/each}
			</div>
		{:else}
			<Alert color="yellow">
				<div class="flex items-center">
					<Info class="mr-2 h-5 w-5" />
					<span class="font-medium">{m.noDataAvailable()}</span>
				</div>
			</Alert>
		{/if}
	</div>
</main>

<Modal bind:open={showModal} size="xl" class="w-full max-w-4xl" autoclose={false}>
	{#if selectedConversation && selectedGroup}
		<EndedView
			conversationDoc={selectedConversation}
			groupDoc={selectedGroup}
			user={{ uid: studentId }}
		/>
	{/if}
</Modal>
