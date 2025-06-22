<script lang="ts">
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import { Card, Button, Spinner } from 'flowbite-svelte';
	import { UserPlus, UserCog } from 'lucide-svelte';
	import WordCloud from '$lib/components/session/WordCloud.svelte';
	import {
		orderBy,
		limit,
		query,
		where,
		Timestamp,
		collectionGroup,
		getDoc,
		getDocs,
		doc,
		collection
	} from 'firebase/firestore';
	import { profile } from '$lib/stores/profile';
	import { db } from '$lib/firebase';
	import type { Session } from '$lib/schema/session';
	import { user } from '$lib/stores/auth';
	import SessionCard from '$lib/components/SessionCard.svelte';
	import Title from '$lib/components/Title.svelte';
	import type { Conversation } from '$lib/schema/conversation';

	import * as m from '$lib/paraglide/messages.js';
	import SingleStudentParticipationChart from '$lib/components/SingleStudentParticipationChart.svelte';
	import SingleStudentSubtaskChart from '$lib/components/SingleStudentSubtaskChart.svelte';
	import { countWords } from '$lib/utils/countWords';

	let { data } = $props();
	let sessions = writable<[string, Session][]>([]);

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

	let isLoadingAnalysis = $state(false);
	let groupSummaryMap = writable<Record<string, string>>({});
	let personalSummaryMap = writable<Record<string, string>>({});
	let sessionTitleMap = writable<Record<string, string>>({});
	let selectedSummarySessionId = writable<string>('');
	let personalKeywords = writable<Record<string, number>>({});
	let personalParticipation = writable<
		Array<{ sessionId: string; sessionTitle: string; words: number; averageWords: number }>
	>([]);
	let personalSubtask = writable<
		Array<{
			sessionId: string;
			sessionTitle: string;
			completionRate: number;
			averageCompletionRate: number;
		}>
	>([]);
	let reflectionProblemMap = writable<Record<string, string>>({});
	let learningRecordMap = writable<Record<string, string>>({});

	async function loadPersonalAnalysis() {
		isLoadingAnalysis = true;
		const uid = data.user.uid;
		const groupQuery = query(
			collectionGroup(db, 'groups'),
			where('participants', 'array-contains', uid),
			orderBy('createdAt', 'desc')
		);
		const groupSnapshot = await getDocs(groupQuery);

		const groupSummary: Record<string, string> = {};
		const personalSummary: Record<string, string> = {};
		const keywordMap: Record<string, number> = {};
		let participationArr: Array<{
			sessionId: string;
			sessionTitle: string;
			words: number;
			averageWords: number;
		}> = [];
		let subtaskArr: Array<{
			sessionId: string;
			sessionTitle: string;
			completionRate: number;
			averageCompletionRate: number;
		}> = [];
		const reflectionMap: Record<string, string> = {};
		const learningMap: Record<string, string> = {};

		for (const groupDoc of groupSnapshot.docs.reverse()) {
			const groupData = groupDoc.data() as {
				summary?: string;
				discussions?: Array<{ speaker: string; content: string }>;
			};
			const sessionId = groupDoc.ref.parent.parent?.id ?? '';
			const sessionDoc = sessionId ? await getDoc(doc(db, 'sessions', sessionId)) : null;
			const sessionTitle = sessionDoc?.data()?.title ?? '';

			const reflectionField =
				sessionDoc?.data()?.reflectionProblem || sessionDoc?.data()?.reflectionQuestion || '';
			if (reflectionField) reflectionMap[sessionId] = reflectionField;

			const lrQuery = query(
				collection(groupDoc.ref, 'learningRecords'),
				where('userId', '==', uid)
			);
			const lrSnapshot = await getDocs(lrQuery);
			if (!lrSnapshot.empty) {
				const lrData = lrSnapshot.docs[0].data();
				if (lrData?.answer) learningMap[sessionId] = lrData.answer;
			}

			if (groupData.summary) {
				groupSummary[sessionId] = groupData.summary;
				sessionTitleMap.update((map) => {
					map[sessionId] = sessionTitle;
					return map;
				});
				sessionTitleMap.update((map) => {
					map[sessionId + '_createdAt'] = sessionDoc?.data()?.createdAt?.toDate?.() ?? '';
					return map;
				});
			}

			let words = 0;
			if (Array.isArray(groupData.discussions)) {
				groupData.discussions.forEach((d: { speaker: string; content: string }) => {
					if (d.speaker === uid && d.content) {
						words += countWords(d.content);
					}
				});
			}

			const convQuery = query(
				collection(groupDoc.ref, 'conversations'),
				where('userId', '==', uid)
			);
			const convSnapshot = await getDocs(convQuery);
			let completionRate = 0,
				convCount = 0;
			for (const convDoc of convSnapshot.docs) {
				const convData = convDoc.data() as Conversation;
				if (convData?.summary) {
					personalSummary[sessionId] = convData.summary;
				}
				if (Array.isArray(convData.keyPoints)) {
					convData.keyPoints.forEach((k: string) => {
						if (k) keywordMap[k] = (keywordMap[k] || 0) + 1;
					});
				}
				if (Array.isArray(convData.history)) {
					convData.history.forEach((msg: { role: string; content: string }) => {
						if (msg.role === 'user' && msg.content) words += countWords(msg.content);
					});
				}
				if (Array.isArray(convData.subtaskCompleted) && convData.subtaskCompleted.length) {
					const completed = convData.subtaskCompleted.filter(Boolean).length;
					const total = convData.subtaskCompleted.length;
					completionRate += (completed / total) * 100;
					convCount++;
				}
			}
			let avgWords = 0;
			let avgCompletion = 0;
			participationArr.push({
				sessionId,
				sessionTitle,
				words,
				averageWords: avgWords
			});
			subtaskArr.push({
				sessionId,
				sessionTitle,
				completionRate: convCount ? completionRate / convCount : 0,
				averageCompletionRate: avgCompletion
			});
		}

		personalSummaryMap.set(personalSummary);
		groupSummaryMap.set(groupSummary);
		personalKeywords.set(keywordMap);
		personalParticipation.set(participationArr);
		personalSubtask.set(subtaskArr);
		reflectionProblemMap.set(reflectionMap);
		learningRecordMap.set(learningMap);
		const sessionIds = Object.keys(groupSummary);
		if (sessionIds.length > 0) selectedSummarySessionId.set(sessionIds[0]);
		isLoadingAnalysis = false;
	}

	onMount(() => {
		getSessions();
		loadPersonalAnalysis();
	});
</script>

<Title page="Dashboard" />

<main class="mx-auto max-w-6xl px-4 py-16">
	<div class="mb-12">
		<h1 class="text-3xl font-bold text-gray-900">{m.dashboard()}</h1>
		<p class="mt-2 text-gray-600">
			{m.welcomeDashboard()}, {$profile?.displayName || $user?.displayName}
		</p>
	</div>

	<div class="mb-16 grid gap-6 md:grid-cols-3 lg:grid-cols-4">
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
						classId={session.classId}
					/>
				{/each}
			</div>
		</div>
	{/if}

	<div class="mb-12 mt-16 rounded bg-gray-50 p-6 shadow">
		<h2 class="mb-4 text-2xl font-bold">{m.personal_analysis()}</h2>
		{#if isLoadingAnalysis}
			<Spinner />
		{:else}
			<div class="mb-4">
				<h3 class="mb-2 text-xl font-semibold">{m.personal_participation_chart()}</h3>
				<SingleStudentParticipationChart
					studentName={$profile?.displayName || $user?.displayName || undefined}
					sessions={$personalParticipation}
				/>
			</div>
			<div class="mb-4">
				<h3 class="mb-2 text-xl font-semibold">{m.personal_subtask_chart()}</h3>
				<SingleStudentSubtaskChart
					studentName={$profile?.displayName || $user?.displayName || undefined}
					sessions={$personalSubtask}
				/>
			</div>
			<div class="mb-4">
				<h3 class="mb-2 text-xl font-semibold">{m.personal_keywords()}</h3>
				{#if Object.keys($personalKeywords).length === 0}
					<span class="text-gray-500">{m.no_keywords()}</span>
				{:else}
					<div class="flex flex-wrap gap-2">
						{#each Object.entries($personalKeywords) as [kw, count]}
							<span class="rounded-full bg-primary-100 px-3 py-1 text-primary-700"
								>{kw} <span class="ml-1 text-xs text-gray-500">x{count}</span></span
							>
						{/each}
					</div>
				{/if}
			</div>
			<div class="mb-4">
				<h3 class="mb-2 text-xl font-semibold">{m.personal_wordcloud()}</h3>
				{#if Object.keys($personalKeywords).length === 0}
					<span class="text-gray-500">{m.no_keywords()}</span>
				{:else}
					<div class="h-64 w-full">
						<WordCloud words={$personalKeywords} minFontSize={16} maxFontSize={48} />
					</div>
				{/if}
			</div>
			<div class="mb-4">
				<h3 class="mb-2 text-xl font-semibold">{m.session_summary()}</h3>
				{#if Object.keys($groupSummaryMap).length > 0}
					<select
						id="summary-session-select"
						bind:value={$selectedSummarySessionId}
						class="mb-2 rounded border px-2 py-1"
					>
						<option value="__ALL__">{m.showAll()}</option>
						{#each Object.keys($groupSummaryMap) as sid}
							<option value={sid}>
								{$sessionTitleMap[sid]}
								{#if $sessionTitleMap[sid + '_createdAt']}
									(
									{new Date($sessionTitleMap[sid + '_createdAt']).toLocaleString('zh-TW', {
										year: 'numeric',
										month: '2-digit',
										day: '2-digit',
										hour: '2-digit',
										minute: '2-digit'
									})}
									)
								{/if}
							</option>
						{/each}
					</select>
					{#if $selectedSummarySessionId === '__ALL__'}
						{#each Object.keys($groupSummaryMap) as sid}
							<div class="mb-6 border-b pb-4 last:border-b-0 last:pb-0">
								<p class="text-lg font-semibold">
									{$sessionTitleMap[sid]}
									{#if $sessionTitleMap[sid + '_createdAt']}
										(
										{new Date($sessionTitleMap[sid + '_createdAt']).toLocaleString('zh-TW', {
											year: 'numeric',
											month: '2-digit',
											day: '2-digit',
											hour: '2-digit',
											minute: '2-digit'
										})}
										)
									{/if}
								</p>
								<p class="text-m mb-1 mt-2 font-semibold">{m.personal_summary()}</p>
								<p class="mt-2">{$personalSummaryMap[sid]}</p>
								<p class="text-m mb-1 mt-2 font-semibold">{m.group_summary()}</p>
								<p class="mt-2">{$groupSummaryMap[sid]}</p>
								{#if $reflectionProblemMap[sid]}
									<p class="text-m mb-1 mt-2 font-semibold">{m.reflectionQuestion()}</p>
									<p class="mt-2">{$reflectionProblemMap[sid]}</p>
								{/if}
								{#if $learningRecordMap[sid]}
									<p class="text-m mb-1 mt-2 font-semibold">{m.reflectionAnswer()}</p>
									<p class="mt-2 whitespace-pre-line">{$learningRecordMap[sid]}</p>
								{/if}
							</div>
						{/each}
					{:else}
						<p class="text-m mb-1 mt-2 font-semibold">{m.personal_summary()}</p>
						<p class="mt-2">{$personalSummaryMap[$selectedSummarySessionId]}</p>
						<p class="text-m mb-1 mt-2 font-semibold">{m.group_summary()}</p>
						<p class="mt-2">{$groupSummaryMap[$selectedSummarySessionId]}</p>
						{#if $reflectionProblemMap[$selectedSummarySessionId]}
							<p class="text-m mb-1 mt-2 font-semibold">{m.reflectionQuestion()}</p>
							<p class="mt-2">{$reflectionProblemMap[$selectedSummarySessionId]}</p>
						{/if}
						{#if $learningRecordMap[$selectedSummarySessionId]}
							<p class="text-m mb-1 mt-2 font-semibold">{m.reflectionAnswer()}</p>
							<p class="mt-2 whitespace-pre-line">
								{$learningRecordMap[$selectedSummarySessionId]}
							</p>
						{:else}
							<p class="text-gray-500">{m.no_reflectionAnswer()}</p>
						{/if}
					{/if}
				{/if}
			</div>
		{/if}
	</div>
</main>
