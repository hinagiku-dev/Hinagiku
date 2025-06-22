<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import {
		Card,
		Button,
		Select,
		Alert,
		Spinner,
		Input,
		Label,
		Modal,
		Checkbox
	} from 'flowbite-svelte';
	import {
		Users,
		Calendar,
		UserPlus,
		Info,
		X,
		Check,
		Trash2,
		Edit,
		BarChart3,
		Activity,
		MessageSquare,
		Target
	} from 'lucide-svelte';
	import Title from '$lib/components/Title.svelte';
	import SessionCard from '$lib/components/SessionCard.svelte';
	import ResolveUsername from '$lib/components/ResolveUsername.svelte';
	import QRCode from '$lib/components/QRCode.svelte';
	import WordCloud from '$lib/components/session/WordCloud.svelte';
	import ParticipationChart from '$lib/components/ParticipationChart.svelte';
	import SubtaskCompletionChart from '$lib/components/SubtaskCompletionChart.svelte';
	import StudentParticipationChart from '$lib/components/StudentParticipationChart.svelte';
	import DiscussionParticipationChart from '$lib/components/DiscussionParticipationChart.svelte';
	import SingleStudentParticipationChart from '$lib/components/SingleStudentParticipationChart.svelte';
	import SingleStudentSubtaskChart from '$lib/components/SingleStudentSubtaskChart.svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { user } from '$lib/stores/auth';
	import { UI_CLASSES } from '$lib/config/ui';
	import { writable, derived as derivedStore } from 'svelte/store';
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
	import { getUser } from '$lib/utils/getUser';
	import { countWords } from '$lib/utils/countWords';

	type ConversationMessage = {
		role: 'system' | 'user' | 'assistant';
		content: string;
		audio: string | null;
		warning: {
			moderation: boolean;
			offTopic: boolean;
		} | null;
	};

	type GroupDiscussion = {
		content: string;
		id: string | null;
		speaker: string;
		audio: string | null;
		moderation: boolean;
	};

	// Origin for QR code generation
	let origin = $derived(browser ? $page.url.origin : '');

	// State variables using runes
	let classes = $state<Array<{ id: string; data: Class }>>([]);
	let selectedClassId = $state<string | null>(null);
	let selectedClass = $state<Class | null>(null);

	// All sessions state
	let allSessions = $state<Array<{ id: string; data: Session }>>([]);
	let isLoadingAllSessions = $state(false);

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

	// Session title filtering - using runes
	let selectedTitles = $state<string[]>([]);

	// Flag to ensure default title selection happens only once
	let titlesInitialized = $state(false);
	let urlHasBeenProcessed = $state(false);

	// Student selection state
	let selectedStudent = $state<string | null>(null);
	let selectedStudentName = $state<string | null>(null);
	let availableStudents = $derived(() => {
		if (!selectedClass) return [];
		return selectedClass.students || [];
	});

	// Word cloud data
	let keywordData = $state<Record<string, number>>({});
	let isLoadingKeywords = $state(false);

	// Real chart data states
	let participationData = $state<
		Array<{ className: string; sessions: Array<{ sessionName: string; participation: number }> }>
	>([]);
	let studentParticipationData = $state<
		Array<{
			sessionId: string;
			sessionTitle: string;
			participants: {
				[displayName: string]: {
					words: number;
				};
			};
		}>
	>([]);
	let studentParticipationNames = $state<string[]>([]);
	let subtaskCompletionData = $state<
		Array<{
			studentId: string;
			completionRate: number;
		}>
	>([]);
	let discussionParticipationData = $state<
		Array<{ discussionName: string; participation: number }>
	>([]);

	// Single student chart data
	let singleStudentParticipationData = $state<
		Array<{ sessionId: string; sessionTitle: string; words: number; averageWords: number }>
	>([]);
	let singleStudentSubtaskData = $state<
		Array<{
			sessionId: string;
			sessionTitle: string;
			completionRate: number;
			averageCompletionRate: number;
		}>
	>([]);

	// Loading states for charts
	let isLoadingParticipationData = $state(false);
	let isLoadingStudentParticipationData = $state(false);
	let isLoadingSubtaskData = $state(false);
	let isLoadingDiscussionData = $state(false);
	let isLoadingSingleStudentParticipation = $state(false);
	let isLoadingSingleStudentSubtask = $state(false);

	let filteredClassSessions = derivedStore(
		[classSessionsStore, selectedLabels],
		([$classSessionsStore, $selectedLabels]) => {
			if (!$classSessionsStore || $selectedLabels.length === 0) return $classSessionsStore;
			return $classSessionsStore.filter(([, session]) =>
				$selectedLabels.every((label) => session.labels?.includes(label))
			);
		}
	);

	let availableLabels = derivedStore(classSessionsStore, ($classSessionsStore) => {
		if (!$classSessionsStore) return [];
		const labels = new Set<string>();
		$classSessionsStore.forEach(([, session]) => {
			session.labels?.forEach((label) => labels.add(label));
		});
		return Array.from(labels).sort();
	});

	let availableTitles = $derived(() => {
		console.log('Computing availableTitles, allSessions length:', allSessions?.length);
		if (!allSessions || allSessions.length === 0) return [];
		const titles = new Set<string>();
		allSessions.forEach((session) => {
			titles.add(session.data.title);
		});
		const result = Array.from(titles).sort();
		console.log('Available titles:', result);
		return result;
	});

	// Effect to debug session title selection
	$effect(() => {
		console.log('Selected titles changed:', selectedTitles);
		console.log('Available titles:', availableTitles);
		console.log('All sessions count:', allSessions?.length);
	});

	// Effect to load keyword data when selected titles change
	$effect(() => {
		if (selectedTitles.length > 0) {
			console.log('Loading keyword data for titles:', selectedTitles);
			loadKeywordData();
		} else {
			console.log('No titles selected, clearing keyword data');
			keywordData = {};
		}

		// Also reload chart data when titles change
		if (hasInitialized && browser) {
			console.log('Reloading all chart data due to title change');
			loadParticipationData();
			loadDiscussionParticipationData();
			if (selectedClassId) {
				loadStudentParticipationData();
				loadSubtaskCompletionData();
			}
		}
	});

	// Effect to load chart data when classes are loaded
	$effect(() => {
		if (classes.length > 0 && hasInitialized) {
			loadParticipationData();
			loadDiscussionParticipationData();
		}
	});

	// Effect to load class-specific chart data when class is selected
	$effect(() => {
		if (selectedClassId && hasInitialized) {
			loadStudentParticipationData();
			loadSubtaskCompletionData();
			loadDiscussionParticipationData();
		} else if (!selectedClassId) {
			// Clear class-specific data when no class is selected
			studentParticipationData = [];
			subtaskCompletionData = [];
		}
	});

	// Effect to reload chart data when selectedTitles changes
	$effect(() => {
		console.log('Selected titles changed:', selectedTitles);
		if (hasInitialized && browser) {
			console.log('Reloading participation data...');
			loadParticipationData();
			if (selectedClassId) {
				console.log('Reloading student participation data...');
				loadStudentParticipationData();
				if (selectedStudent) {
					loadSingleStudentParticipationData();
					loadSingleStudentSubtaskData();
				}
			}
			loadDiscussionParticipationData();
		}
	});

	// Effect: Automatically select all session titles on first load
	$effect(() => {
		const titles = availableTitles();
		if (!titlesInitialized && titles.length > 0) {
			selectedTitles = [...titles];
			titlesInitialized = true;
			console.log('Defaulting selectedTitles to all available titles:', selectedTitles);
		}
	});

	function handleLabelSelect(label: string) {
		selectedLabels.update((labels) => {
			if (labels.includes(label)) {
				return labels.filter((l) => l !== label);
			}
			return [...labels, label].sort();
		});
	}

	function handleTitleSelect(title: string) {
		console.log('Handling title select:', title);
		if (selectedTitles.includes(title)) {
			selectedTitles = selectedTitles.filter((t) => t !== title);
		} else {
			selectedTitles = [...selectedTitles, title].sort();
		}
		console.log('New selected titles:', selectedTitles);
	}

	function selectAllTitles() {
		selectedTitles = [...availableTitles()];
		console.log('Selected all titles:', selectedTitles);
	}

	function deselectAllTitles() {
		selectedTitles = [];
		console.log('Deselected all titles');
	}

	// Convert between empty string and null for selectedClassId to work with Select component
	let selectValue = $state<string>('');

	$effect(() => {
		if (selectedClassId === null) {
			selectValue = '';
		} else {
			selectValue = selectedClassId;
		}
	});

	$effect(() => {
		if (selectValue === '') {
			selectedClassId = null;
		} else {
			selectedClassId = selectValue;
		}
	});

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
			loadClasses().then(() => {
				loadAllSessions();
			});
		}
	});

	// Effect to handle URL parameter for pre-selecting class (only on initial load)
	$effect(() => {
		if (
			browser &&
			classes.length > 0 &&
			!selectedClassId &&
			hasInitialized &&
			!urlHasBeenProcessed
		) {
			const urlClassId = $page.url.searchParams.get('classId');
			if (urlClassId && classes.some((c) => c.id === urlClassId)) {
				selectedClassId = urlClassId;
			}
			urlHasBeenProcessed = true;
		}
	});

	// Effect to update URL when class selection changes
	$effect(() => {
		if (browser && selectedClassId && hasInitialized) {
			const currentUrl = new URL($page.url);
			if (currentUrl.searchParams.get('classId') !== selectedClassId) {
				currentUrl.searchParams.set('classId', selectedClassId);
				currentUrl.searchParams.set('manualSelection', 'true');
				goto(currentUrl.toString(), { replaceState: true });
			}
		} else if (browser && selectedClassId === null && hasInitialized) {
			const currentUrl = new URL($page.url);
			if (
				currentUrl.searchParams.has('classId') ||
				currentUrl.searchParams.has('manualSelection')
			) {
				currentUrl.searchParams.delete('classId');
				currentUrl.searchParams.delete('manualSelection');
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

	// Load all sessions created by the user (only those with classId)
	async function loadAllSessions() {
		if (!$user || !browser) return;

		try {
			isLoadingAllSessions = true;
			console.log('Loading all sessions for user:', $user.uid);

			const activeClassIds = classes
				.filter((cls) => cls.data.active_status !== 'archived')
				.map((cls) => cls.id);

			// If no active classes, return empty array
			if (activeClassIds.length === 0) {
				console.log('No active classes found, skipping session loading');
				allSessions = [];
				return;
			}

			const sessionsQuery = query(
				collection(db, 'sessions'),
				where('host', '==', $user.uid),
				where('classId', 'in', activeClassIds),
				where('status', '==', 'ended'),
				where('active_status', '!=', 'archived'),
				orderBy('createdAt', 'desc')
			);

			const snapshot = await getDocs(sessionsQuery);
			const sessionsData = snapshot.docs.map((doc) => ({
				id: doc.id,
				data: doc.data() as Session
			}));

			console.log('Loaded sessions:', sessionsData.length, sessionsData);
			allSessions = sessionsData;
		} catch (error) {
			console.error('Error loading all sessions:', error);
			notifications.error(m.loadingAllSessions());
		} finally {
			isLoadingAllSessions = false;
		}
	}

	// Load keyword data from selected sessions
	async function loadKeywordData() {
		if (!browser || selectedTitles.length === 0) {
			keywordData = {};
			return;
		}

		try {
			isLoadingKeywords = true;

			const sessionsToAnalyze = selectedClassId
				? allSessions.filter((session) => session.data.classId === selectedClassId)
				: allSessions;

			const selectedSessionIds = sessionsToAnalyze
				.filter((session) => selectedTitles.includes(session.data.title))
				.map((session) => session.id);

			if (selectedSessionIds.length === 0) {
				keywordData = {};
				return;
			}

			if (selectedStudent) {
				const studentKeywords: Record<string, number> = {};

				for (const sessionId of selectedSessionIds) {
					const groupsQuery = query(collection(db, 'sessions', sessionId, 'groups'));
					const groupsSnapshot = await getDocs(groupsQuery);

					for (const groupDoc of groupsSnapshot.docs) {
						const conversationsQuery = query(
							collection(db, 'sessions', sessionId, 'groups', groupDoc.id, 'conversations')
						);
						const conversationsSnapshot = await getDocs(conversationsQuery);
						conversationsSnapshot.forEach((doc) => {
							const convData = doc.data();
							if (
								convData.userId === selectedStudent &&
								convData.keyPoints &&
								Array.isArray(convData.keyPoints)
							) {
								convData.keyPoints.forEach((keyPoint: string) => {
									if (keyPoint) {
										studentKeywords[keyPoint] = (studentKeywords[keyPoint] || 0) + 1;
									}
								});
							}
						});
					}
				}
				keywordData = studentKeywords;
			} else {
				const keywordPromises = selectedSessionIds.map(async (sessionId) => {
					try {
						const response = await fetch(`/api/session/${sessionId}/conversations/keywords`);
						if (response.ok) {
							return await response.json();
						}
						return {};
					} catch (error) {
						console.error(`Error loading keywords for session ${sessionId}:`, error);
						return {};
					}
				});

				const keywordResults = await Promise.all(keywordPromises);

				const mergedKeywords: Record<string, number> = {};
				keywordResults.forEach((keywords) => {
					Object.entries(keywords).forEach(([word, count]) => {
						mergedKeywords[word] = (mergedKeywords[word] || 0) + (count as number);
					});
				});

				keywordData = mergedKeywords;
			}
		} catch (error) {
			console.error('Error loading keyword data:', error);
			notifications.error(m.failedToLoadKeywordData());
		} finally {
			isLoadingKeywords = false;
		}
	}

	// Load participation data across all classes
	async function loadParticipationData() {
		if (!$user || !browser) return;

		try {
			isLoadingParticipationData = true;
			const classParticipationData: Array<{
				className: string;
				sessions: Array<{ sessionName: string; participation: number }>;
			}> = [];

			for (const cls of classes) {
				if (cls.data.active_status === 'archived') continue;

				const sessionsQuery = query(
					collection(db, 'sessions'),
					where('classId', '==', cls.id),
					where('status', '==', 'ended'),
					orderBy('createdAt', 'asc')
				);

				const snapshot = await getDocs(sessionsQuery);
				const sessions: Array<{ sessionName: string; participation: number }> = [];

				for (const sessionDoc of snapshot.docs) {
					const sessionData = sessionDoc.data() as Session;

					if (selectedTitles.length > 0 && !selectedTitles.includes(sessionData.title)) {
						continue;
					}

					const groupsQuery = query(collection(db, 'sessions', sessionDoc.id, 'groups'));
					const groupsSnapshot = await getDocs(groupsQuery);
					let totalWords = 0;

					for (const groupDoc of groupsSnapshot.docs) {
						const groupData = groupDoc.data();

						if (groupData.discussions && Array.isArray(groupData.discussions)) {
							groupData.discussions.forEach((discussion: GroupDiscussion) => {
								if (discussion.content && discussion.speaker !== '小菊') {
									totalWords += countWords(discussion.content);
								}
							});
						}

						const conversationsQuery = query(
							collection(db, 'sessions', sessionDoc.id, 'groups', groupDoc.id, 'conversations')
						);
						const conversationsSnapshot = await getDocs(conversationsQuery);
						conversationsSnapshot.docs.forEach((convDoc) => {
							const convData = convDoc.data();
							if (convData.history && Array.isArray(convData.history)) {
								convData.history.forEach((message: ConversationMessage) => {
									if (message.role === 'user' && message.content) {
										totalWords += countWords(message.content);
									}
								});
							}
						});
					}

					sessions.push({
						sessionName: sessionData.title,
						participation: totalWords
					});
				}

				if (sessions.length > 0) {
					classParticipationData.push({
						className: cls.data.className,
						sessions: sessions
					});
				}
			}

			participationData = classParticipationData;
		} catch (error) {
			console.error('Error loading participation data:', error);
			notifications.error(m.failedToLoadParticipationData());
		} finally {
			isLoadingParticipationData = false;
		}
	}

	// Load student participation data for selected class
	async function loadStudentParticipationData() {
		if (!selectedClassId || !browser || !selectedClass) {
			studentParticipationData = [];
			return;
		}

		try {
			isLoadingStudentParticipationData = true;

			// Get all students for the class and sort them by seat number
			const studentDetailsPromises = (selectedClass.students || []).map((id) => getUser(id));
			const studentDetails = await Promise.all(studentDetailsPromises);
			studentDetails.sort((a, b) => {
				const seatA = a.seatNumber ? parseInt(a.seatNumber, 10) : Infinity;
				const seatB = b.seatNumber ? parseInt(b.seatNumber, 10) : Infinity;
				if (isNaN(seatA) && isNaN(seatB)) {
					return a.displayName.localeCompare(b.displayName);
				}
				if (isNaN(seatA)) return 1;
				if (isNaN(seatB)) return -1;
				return seatA - seatB;
			});

			studentParticipationNames = studentDetails.map((s) => s.displayName);
			const userMap = new Map(studentDetails.map((s) => [s.uid, s.displayName]));

			const sessionParticipationData: Array<{
				sessionId: string;
				sessionTitle: string;
				participants: { [displayName: string]: { words: number } };
			}> = [];

			const sessionsQuery = query(
				collection(db, 'sessions'),
				where('classId', '==', selectedClassId),
				where('status', '==', 'ended'),
				orderBy('createdAt', 'asc')
			);

			const snapshot = await getDocs(sessionsQuery);

			for (const sessionDoc of snapshot.docs) {
				const sessionData = sessionDoc.data() as Session;

				if (selectedTitles.length > 0 && !selectedTitles.includes(sessionData.title)) {
					continue;
				}

				const groupsQuery = query(collection(db, 'sessions', sessionDoc.id, 'groups'));
				const groupsSnapshot = await getDocs(groupsQuery);
				const userWordCounts: Record<string, number> = {};

				for (const groupDoc of groupsSnapshot.docs) {
					const groupData = groupDoc.data();

					if (groupData.discussions && Array.isArray(groupData.discussions)) {
						groupData.discussions.forEach((discussion: GroupDiscussion) => {
							if (discussion.speaker && discussion.content && discussion.speaker !== '小菊') {
								const words = countWords(discussion.content);
								userWordCounts[discussion.speaker] =
									(userWordCounts[discussion.speaker] || 0) + words;
							}
						});
					}

					const conversationsQuery = query(
						collection(db, 'sessions', sessionDoc.id, 'groups', groupDoc.id, 'conversations')
					);
					const conversationsSnapshot = await getDocs(conversationsQuery);
					conversationsSnapshot.forEach((doc) => {
						const convData = doc.data();
						if (convData.userId && convData.history && Array.isArray(convData.history)) {
							convData.history.forEach((msg: ConversationMessage) => {
								if (msg.role === 'user' && msg.content) {
									const words = countWords(msg.content);
									userWordCounts[convData.userId] = (userWordCounts[convData.userId] || 0) + words;
								}
							});
						}
					});
				}

				if (Object.keys(userWordCounts).length > 0) {
					const participantsForSession: { [displayName: string]: { words: number } } = {};
					for (const [userId, words] of Object.entries(userWordCounts)) {
						const displayName = userMap.get(userId);
						if (displayName) {
							participantsForSession[displayName] = { words };
						}
					}

					sessionParticipationData.push({
						sessionId: sessionDoc.id,
						sessionTitle: sessionData.title,
						participants: participantsForSession
					});
				}
			}

			studentParticipationData = sessionParticipationData;
		} catch (error) {
			console.error('Error loading student participation data:', error);
			notifications.error(m.failedToLoadStudentParticipationData());
		} finally {
			isLoadingStudentParticipationData = false;
		}
	}

	// Load subtask completion data for selected class
	async function loadSubtaskCompletionData() {
		if (!selectedClassId || !browser) {
			subtaskCompletionData = [];
			return;
		}

		try {
			isLoadingSubtaskData = true;

			const sessionsQuery = query(
				collection(db, 'sessions'),
				where('classId', '==', selectedClassId),
				where('status', '==', 'ended'),
				orderBy('createdAt', 'asc')
			);

			const snapshot = await getDocs(sessionsQuery);
			const userSubtaskMap = new Map<string, { sessionId: string; subtasks: boolean[] }[]>();

			for (const sessionDoc of snapshot.docs) {
				const sessionData = sessionDoc.data() as Session;

				if (selectedTitles.length > 0 && !selectedTitles.includes(sessionData.title)) {
					continue;
				}

				const sessionId = sessionDoc.id;
				// Get groups for this session
				const groupsQuery = query(collection(db, 'sessions', sessionId, 'groups'));

				try {
					const groupsSnapshot = await getDocs(groupsQuery);

					// Go through each group and get their conversations
					for (const groupDoc of groupsSnapshot.docs) {
						const conversationsQuery = query(
							collection(db, 'sessions', sessionId, 'groups', groupDoc.id, 'conversations')
						);

						try {
							const conversationsSnapshot = await getDocs(conversationsQuery);

							conversationsSnapshot.docs.forEach((convDoc) => {
								const convData = convDoc.data();
								const userId = convData.userId;

								if (
									userId &&
									convData.subtaskCompleted &&
									Array.isArray(convData.subtaskCompleted)
								) {
									if (!userSubtaskMap.has(userId)) {
										userSubtaskMap.set(userId, []);
									}
									// Only add if there is subtask data
									if (convData.subtaskCompleted.length > 0) {
										userSubtaskMap
											.get(userId)!
											.push({ sessionId: sessionId, subtasks: convData.subtaskCompleted });
									}
								}
							});
						} catch (error) {
							console.error(`Error loading conversations for group ${groupDoc.id}:`, error);
						}
					}
				} catch (error) {
					console.error(`Error loading groups for session ${sessionDoc.id}:`, error);
				}
			}

			// Calculate average completion for each user and get displayName
			const userPromises = Array.from(userSubtaskMap.entries()).map(
				async ([userId, participatedSessions]) => {
					if (participatedSessions.length > 0) {
						let totalCompleted = 0;
						let totalSubtasks = 0;

						participatedSessions.forEach((session) => {
							totalSubtasks += session.subtasks.length;
							totalCompleted += session.subtasks.filter(Boolean).length;
						});

						const completionRate = totalSubtasks > 0 ? (totalCompleted / totalSubtasks) * 100 : 0;

						try {
							const user = await getUser(userId);
							return {
								studentId: user.displayName,
								completionRate: completionRate,
								seatNumber: user.seatNumber
							};
						} catch (error) {
							console.error(`Error getting user ${userId}:`, error);
							return {
								studentId: userId, // Fallback to userId if getUser fails
								completionRate: completionRate,
								seatNumber: null
							};
						}
					}
					return null;
				}
			);

			const promisedResults = await Promise.all(userPromises);
			const userResults = promisedResults.filter((result) => result !== null) as Array<{
				studentId: string;
				completionRate: number;
				seatNumber: string | null | undefined;
			}>;

			// Sort by seat number
			userResults.sort((a, b) => {
				const seatA = a.seatNumber ? parseInt(a.seatNumber, 10) : Infinity;
				const seatB = b.seatNumber ? parseInt(b.seatNumber, 10) : Infinity;
				if (isNaN(seatA) && isNaN(seatB)) return a.studentId.localeCompare(b.studentId);
				if (isNaN(seatA)) return 1;
				if (isNaN(seatB)) return -1;
				return seatA - seatB;
			});

			subtaskCompletionData = userResults.map(({ studentId, completionRate }) => ({
				studentId,
				completionRate
			}));
		} catch (error) {
			console.error('Error loading subtask completion data:', error);
			notifications.error(m.failedToLoadSubtaskCompletionData());
		} finally {
			isLoadingSubtaskData = false;
		}
	}

	// Load discussion participation data
	async function loadDiscussionParticipationData() {
		if (!browser) return;

		try {
			isLoadingDiscussionData = true;
			const discussionData: Array<{ discussionName: string; participation: number }> = [];

			// Get sessions to analyze
			const sessionsToAnalyze = selectedClassId
				? allSessions.filter((session) => session.data.classId === selectedClassId)
				: allSessions;

			// Filter by selected titles if any are selected
			const filteredSessions =
				selectedTitles.length > 0
					? sessionsToAnalyze.filter((session) => selectedTitles.includes(session.data.title))
					: sessionsToAnalyze;

			console.log('Analyzing sessions for discussion data:', filteredSessions.length);

			const titleParticipationMap = new Map<string, number[]>();

			for (const session of filteredSessions) {
				// Get group discussions for this session
				const groupsQuery = query(collection(db, 'sessions', session.id, 'groups'));

				try {
					const groupsSnapshot = await getDocs(groupsQuery);
					const userWordCounts: Record<string, number> = {};

					for (const groupDoc of groupsSnapshot.docs) {
						const groupData = groupDoc.data();

						// Get words from discussions
						if (groupData.discussions && Array.isArray(groupData.discussions)) {
							groupData.discussions.forEach((discussion: GroupDiscussion) => {
								if (discussion.speaker && discussion.content && discussion.speaker !== '小菊') {
									const words = countWords(discussion.content);
									userWordCounts[discussion.speaker] =
										(userWordCounts[discussion.speaker] || 0) + words;
								}
							});
						}

						// Get words from conversations
						const conversationsQuery = query(
							collection(db, 'sessions', session.id, 'groups', groupDoc.id, 'conversations')
						);
						const conversationsSnapshot = await getDocs(conversationsQuery);
						conversationsSnapshot.forEach((doc) => {
							const convData = doc.data();
							if (convData.userId && convData.history && Array.isArray(convData.history)) {
								convData.history.forEach((msg: ConversationMessage) => {
									if (msg.role === 'user' && msg.content) {
										const words = countWords(msg.content);
										userWordCounts[convData.userId] =
											(userWordCounts[convData.userId] || 0) + words;
									}
								});
							}
						});
					}

					const totalWords = Object.values(userWordCounts).reduce((sum, words) => sum + words, 0);
					const participantCount = Object.keys(userWordCounts).length;

					if (participantCount > 0) {
						const avgParticipation = totalWords / participantCount;
						if (!titleParticipationMap.has(session.data.title)) {
							titleParticipationMap.set(session.data.title, []);
						}
						titleParticipationMap.get(session.data.title)!.push(avgParticipation);
					}
				} catch (error) {
					console.error(`Error loading groups for session ${session.id}:`, error);
				}
			}

			// Calculate average participation per discussion title
			titleParticipationMap.forEach((participations, title) => {
				const avgParticipation =
					participations.reduce((sum, p) => sum + p, 0) / participations.length;
				discussionData.push({
					discussionName: title,
					participation: Math.round(avgParticipation)
				});
			});

			console.log('Discussion participation data:', discussionData);
			discussionParticipationData = discussionData;
		} catch (error) {
			console.error('Error loading discussion participation data:', error);
			notifications.error(m.failedToLoadDiscussionParticipationData());
		} finally {
			isLoadingDiscussionData = false;
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

	// Effect to reset student selection when class changes
	$effect(() => {
		if (selectedClass) {
			selectedStudent = null;
		}
	});

	// Effect to get student display name
	$effect(() => {
		if (selectedStudent) {
			(async () => {
				try {
					const user = await getUser(selectedStudent);
					selectedStudentName = user.displayName;
				} catch (e) {
					console.error('Failed to get user display name', e);
					selectedStudentName = selectedStudent; // fallback to ID
				}
			})();
		} else {
			selectedStudentName = null;
		}
	});

	// Effect to filter student participation data based on selected student
	$effect(() => {
		if (selectedClassId) {
			loadStudentParticipationData();
		}
	});

	// Effect to load single student data when student is selected
	$effect(() => {
		if (selectedStudent && selectedClassId) {
			loadSingleStudentParticipationData();
			loadSingleStudentSubtaskData();
		} else {
			singleStudentParticipationData = [];
			singleStudentSubtaskData = [];
		}
	});

	// Load single student participation data
	async function loadSingleStudentParticipationData() {
		if (!selectedStudent || !selectedClassId || !browser) {
			singleStudentParticipationData = [];
			return;
		}

		try {
			isLoadingSingleStudentParticipation = true;
			const participationDataForStudent: Array<{
				sessionId: string;
				sessionTitle: string;
				words: number;
				averageWords: number;
			}> = [];

			const sessionsQuery = query(
				collection(db, 'sessions'),
				where('classId', '==', selectedClassId),
				where('status', '==', 'ended'),
				orderBy('createdAt', 'asc')
			);

			const snapshot = await getDocs(sessionsQuery);

			for (const sessionDoc of snapshot.docs) {
				const sessionData = sessionDoc.data() as Session;

				if (selectedTitles.length > 0 && !selectedTitles.includes(sessionData.title)) {
					continue;
				}

				const groupsQuery = query(collection(db, 'sessions', sessionDoc.id, 'groups'));
				const groupsSnapshot = await getDocs(groupsQuery);
				const userWordCounts: Record<string, number> = {};
				const sessionParticipants = new Set<string>();

				for (const groupDoc of groupsSnapshot.docs) {
					const groupData = groupDoc.data();

					// Aggregate words from discussions
					if (groupData.discussions && Array.isArray(groupData.discussions)) {
						groupData.discussions.forEach((discussion: GroupDiscussion) => {
							if (discussion.id && discussion.id !== '小菊') {
								sessionParticipants.add(discussion.id);
								if (discussion.content) {
									const words = countWords(discussion.content);
									userWordCounts[discussion.id] = (userWordCounts[discussion.id] || 0) + words;
								}
							}
						});
					}

					// Aggregate words from conversations
					const conversationsQuery = query(
						collection(db, 'sessions', sessionDoc.id, 'groups', groupDoc.id, 'conversations')
					);
					const conversationsSnapshot = await getDocs(conversationsQuery);
					conversationsSnapshot.forEach((doc) => {
						const convData = doc.data();
						if (convData.userId) {
							sessionParticipants.add(convData.userId);
							if (convData.history && Array.isArray(convData.history)) {
								convData.history.forEach((msg: ConversationMessage) => {
									if (msg.role === 'user' && msg.content) {
										const words = countWords(msg.content);
										userWordCounts[convData.userId] =
											(userWordCounts[convData.userId] || 0) + words;
									}
								});
							}
						}
					});
				}

				// If the selected student did not participate in this session, skip it.
				if (!selectedStudent || !sessionParticipants.has(selectedStudent)) {
					continue;
				}

				const studentWords = userWordCounts[selectedStudent] || 0;
				const allWords = Object.values(userWordCounts).reduce((sum, words) => sum + words, 0);
				const participantCount = sessionParticipants.size;
				const averageWords = participantCount > 0 ? allWords / participantCount : 0;

				participationDataForStudent.push({
					sessionId: sessionDoc.id,
					sessionTitle: sessionData.title,
					words: studentWords,
					averageWords: averageWords
				});
			}
			singleStudentParticipationData = participationDataForStudent;
		} catch (error) {
			console.error('Error loading single student participation data:', error);
			notifications.error(m.failedToLoadStudentParticipationData());
		} finally {
			isLoadingSingleStudentParticipation = false;
		}
	}

	// Load single student subtask data
	async function loadSingleStudentSubtaskData() {
		if (!selectedStudent || !selectedClassId || !browser) {
			singleStudentSubtaskData = [];
			return;
		}

		try {
			isLoadingSingleStudentSubtask = true;
			const subtaskData: Array<{
				sessionId: string;
				sessionTitle: string;
				completionRate: number;
				averageCompletionRate: number;
			}> = [];

			const sessionsQuery = query(
				collection(db, 'sessions'),
				where('classId', '==', selectedClassId),
				where('status', '==', 'ended'),
				orderBy('createdAt', 'asc')
			);

			const snapshot = await getDocs(sessionsQuery);

			for (const sessionDoc of snapshot.docs) {
				const sessionData = sessionDoc.data() as Session;

				if (selectedTitles.length > 0 && !selectedTitles.includes(sessionData.title)) {
					continue;
				}

				const groupsQuery = query(collection(db, 'sessions', sessionDoc.id, 'groups'));

				try {
					const groupsSnapshot = await getDocs(groupsQuery);
					const sessionAllUserSubtasks: Record<string, boolean[]> = {};
					const sessionParticipants = new Set<string>();

					for (const groupDoc of groupsSnapshot.docs) {
						const conversationsQuery = query(
							collection(db, 'sessions', sessionDoc.id, 'groups', groupDoc.id, 'conversations')
						);
						const conversationsSnapshot = await getDocs(conversationsQuery);
						conversationsSnapshot.docs.forEach((convDoc) => {
							const convData = convDoc.data();
							const userId = convData.userId;
							if (userId) {
								sessionParticipants.add(userId);
								if (
									convData.subtaskCompleted &&
									Array.isArray(convData.subtaskCompleted) &&
									convData.subtaskCompleted.length > 0
								) {
									sessionAllUserSubtasks[userId] = convData.subtaskCompleted;
								}
							}
						});
					}

					// If the selected student did not participate in this session, skip it.
					if (!selectedStudent || !sessionParticipants.has(selectedStudent)) {
						continue;
					}

					const studentSubtasks = sessionAllUserSubtasks[selectedStudent] || [];
					let studentCompletionRate = 0;
					if (studentSubtasks.length > 0) {
						studentCompletionRate =
							(studentSubtasks.filter(Boolean).length / studentSubtasks.length) * 100;
					}

					const allCompletionRates = Object.values(sessionAllUserSubtasks).map((subtasks) => {
						if (subtasks.length === 0) return 0;
						return (subtasks.filter(Boolean).length / subtasks.length) * 100;
					});

					const averageCompletionRate =
						allCompletionRates.length > 0
							? allCompletionRates.reduce((sum, rate) => sum + rate, 0) / allCompletionRates.length
							: 0;

					subtaskData.push({
						sessionId: sessionDoc.id,
						sessionTitle: sessionData.title,
						completionRate: studentCompletionRate,
						averageCompletionRate: averageCompletionRate
					});
				} catch (error) {
					console.error(`Error loading groups for session ${sessionDoc.id}:`, error);
				}
			}

			singleStudentSubtaskData = subtaskData;
		} catch (error) {
			console.error('Error loading single student subtask data:', error);
			notifications.error(m.failedToLoadStudentSubtaskData());
		} finally {
			isLoadingSingleStudentSubtask = false;
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
						bind:value={selectValue}
						placeholder="{m.chooseClassToManage()}..."
						class="w-full"
					>
						<option value="">{m.allClasses()}</option>
						{#each classes as classItem}
							{#if classItem.data.active_status === 'active' || classItem.data.active_status == null}
								<option value={classItem.id}>
									{classItem.data.className} - {classItem.data.schoolName} ({classItem.data
										.academicYear})
								</option>
							{/if}
						{/each}
						<option disabled value="" style="color: gray;">
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

			<!-- Session Title Filter (show only when no class selected) -->
			{#if !selectedClassId}
				<Card padding="lg" class="w-full !max-w-none">
					<div class="mb-4">
						<div class="mb-3 flex items-center gap-3">
							<div class="rounded-full bg-primary-100 p-2">
								<BarChart3 size={20} class="text-primary-600" />
							</div>
							<h2 class="text-lg font-semibold text-gray-900">{m.sessionFilter()}</h2>
						</div>
						<p class="mb-4 text-sm text-gray-600">{m.sessionTitleFilter()}</p>
					</div>

					{#if isLoadingAllSessions}
						<div class="flex justify-center">
							<Spinner size="6" />
						</div>
					{:else if availableTitles().length > 0}
						<!-- Select All / Deselect All buttons -->
						<div class="mb-4 flex gap-2">
							<Button size="xs" color="primary" outline on:click={selectAllTitles}>
								{m.selectAll()}
							</Button>
							<Button size="xs" color="alternative" outline on:click={deselectAllTitles}>
								{m.deselectAll()}
							</Button>
						</div>

						<!-- Title checkboxes -->
						<div class="max-h-64 space-y-2 overflow-y-auto">
							{#each availableTitles() as title}
								<label class="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-gray-50">
									<Checkbox
										checked={selectedTitles.includes(title)}
										on:change={() => handleTitleSelect(title)}
										color="primary"
									/>
									<span class="text-sm">{title}</span>
									<span class="ml-auto text-xs text-gray-500">
										({allSessions.filter((s) => s.data.title === title).length})
									</span>
								</label>
							{/each}
						</div>
					{:else}
						<div class="py-4 text-center text-gray-500">
							{m.noSessions()}
						</div>
					{/if}
				</Card>
			{/if}

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

					<!-- Class Analysis Combined Card -->
					<Card padding="lg" class="w-full !max-w-none space-y-8">
						<!-- Header -->
						<div class="mb-4">
							<div class="mb-3 flex items-center gap-3">
								<div class="rounded-full bg-primary-100 p-2">
									<BarChart3 size={20} class="text-primary-600" />
								</div>
								<h3 class="text-lg font-semibold text-gray-900">{m.classAnalysis()}</h3>
							</div>
						</div>

						<!-- Filters Grid -->
						<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
							<!-- Session Title Filter Card -->
							<Card padding="lg" class="w-full !max-w-none">
								<div class="mb-4">
									<div class="mb-3 flex items-center gap-3">
										<div class="rounded-full bg-primary-100 p-2">
											<Calendar size={20} class="text-primary-600" />
										</div>
										<h3 class="text-lg font-semibold text-gray-900">{m.sessionFilter()}</h3>
									</div>
									<p class="text-sm text-gray-600">{m.sessionTitleFilter()}</p>
								</div>

								{#if isLoadingAllSessions}
									<div class="flex justify-center">
										<Spinner size="6" />
									</div>
								{:else if availableTitles().length > 0}
									<div class="mb-4 flex gap-2">
										<Button size="xs" color="primary" outline on:click={selectAllTitles}>
											{m.selectAll()}
										</Button>
										<Button size="xs" color="alternative" outline on:click={deselectAllTitles}>
											{m.deselectAll()}
										</Button>
									</div>
									<div class="max-h-48 space-y-2 overflow-y-auto">
										{#each availableTitles() as title}
											<label
												class="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-gray-50"
											>
												<Checkbox
													checked={selectedTitles.includes(title)}
													on:change={() => handleTitleSelect(title)}
													color="primary"
												/>
												<span class="text-sm">{title}</span>
											</label>
										{/each}
									</div>
								{:else}
									<div class="py-4 text-center text-gray-500">{m.noSessions()}</div>
								{/if}
							</Card>

							<!-- Student Selection Card -->
							<Card padding="lg" class="w-full !max-w-none">
								<div class="mb-4">
									<div class="mb-3 flex items-center gap-3">
										<div class="rounded-full bg-primary-100 p-2">
											<Users size={20} class="text-primary-600" />
										</div>
										<h3 class="text-lg font-semibold text-gray-900">{m.studentFilter()}</h3>
									</div>
									<p class="text-sm text-gray-600">{m.chartStudentParticipationDesc()}</p>
								</div>

								{#if availableStudents().length > 0}
									<Select class="w-full" bind:value={selectedStudent} placeholder={m.allStudents()}>
										<option value={null}>{m.allStudents()}</option>
										{#each availableStudents() as studentId}
											<option value={studentId}>
												<ResolveUsername id={studentId} />
											</option>
										{/each}
									</Select>
									{#if selectedStudent}
										<div class="mt-4">
											<Button
												href="/manage/{selectedClassId}/{selectedStudent}/allSummary"
												color="primary"
												class="w-full"
											>
												<MessageSquare class="mr-2 h-4 w-4" />
												{m.viewAllSummaries()}
											</Button>
										</div>
									{/if}
								{:else}
									<div class="py-4 text-center text-gray-500">{m.noStudentListAvailable()}</div>
								{/if}
							</Card>
						</div>

						<!-- Session Summaries (Only show when single title selected and no student selected) -->
						{#if selectedTitles.length === 1 && !selectedStudent}
							{@const sessionsWithSummary =
								$filteredClassSessions?.filter(
									([, s]) => s.summary && s.title === selectedTitles[0]
								) || []}
							{#if sessionsWithSummary.length > 0}
								<Card padding="lg" class="w-full !max-w-none">
									<div class="mb-4">
										<div class="mb-3 flex items-center gap-3">
											<div class="rounded-full bg-primary-100 p-2">
												<MessageSquare size={20} class="text-primary-600" />
											</div>
											<h3 class="text-lg font-semibold text-gray-900">{m.sessionSummaries()}</h3>
										</div>
									</div>
									<div class="space-y-4">
										{#each sessionsWithSummary as [sessionId, session] (sessionId)}
											<div class="rounded-lg border bg-gray-50 p-4 dark:bg-gray-800">
												<h4 class="font-semibold">{session.title}</h4>
												<div class="prose prose-sm mt-2 max-w-none dark:prose-invert">
													{#if session.summary}
														<div>
															<h5 class="font-semibold">{m.integratedViewpoint()}</h5>
															<p>{session.summary.integratedViewpoint}</p>
														</div>
														<div class="mt-2">
															<h5 class="font-semibold">{m.differences()}</h5>
															<p>{session.summary.differences}</p>
														</div>
														<div class="mt-2">
															<h5 class="font-semibold">{m.learningProgress()}</h5>
															<p>{session.summary.learningProgress}</p>
														</div>
														<div class="mt-2">
															<h5 class="font-semibold">{m.finalConclusion()}</h5>
															<p>{session.summary.finalConclusion}</p>
														</div>
													{/if}
												</div>
											</div>
										{/each}
									</div>
								</Card>
							{/if}
						{/if}

						<!-- Charts -->
						<div class="space-y-8">
							<!-- Word Cloud -->
							<Card padding="lg" class="w-full !max-w-none">
								<div class="mb-4 flex items-center justify-between">
									<div class="flex items-center gap-3">
										<div class="rounded-full bg-primary-100 p-2">
											<BarChart3 size={20} class="text-primary-600" />
										</div>
										<h3 class="text-lg font-semibold text-gray-900">
											{#if selectedStudent && selectedStudentName}
												{selectedStudentName} - {m.keywordWordCloud()}
											{:else}
												{m.keywordWordCloud()}
											{/if}
										</h3>
									</div>
									{#if selectedClassId && !selectedStudent}
										<Button
											size="sm"
											href="/manage/{selectedClassId}/studentWordCloud"
											color="alternative"
										>
											{m.viewAllStudents()}
										</Button>
									{/if}
								</div>
								<p class="text-sm text-gray-600">{m.wordCloudDesc()}</p>
								<div class="rounded-lg border bg-gray-50 p-4">
									{#if selectedTitles.length === 0}
										<div class="flex h-64 flex-col items-center justify-center text-gray-500">
											<Info size={32} class="mb-2" />
											<p>{m.selectCoursesPlaceholder()}</p>
										</div>
									{:else if isLoadingKeywords}
										<div class="flex h-64 items-center justify-center">
											<Spinner size="8" />
											<p class="ml-2 text-gray-600">{m.loadingKeywords()}</p>
										</div>
									{:else if Object.keys(keywordData).length > 0}
										<div class="h-64">
											<WordCloud words={keywordData} minFontSize={12} maxFontSize={48} />
										</div>
									{:else}
										<div class="flex h-64 items-center justify-center text-gray-500">
											<p>{m.noKeywordData()}</p>
										</div>
									{/if}
								</div>
							</Card>

							<!-- Student Participation Chart (show only when NO specific student is selected) -->
							{#if !selectedStudent}
								{#if isLoadingStudentParticipationData}
									<div class="flex h-64 items-center justify-center">
										<Spinner size="8" />
										<p class="ml-2 text-gray-600">{m.loadingStudentParticipationData()}</p>
									</div>
								{:else if studentParticipationData.length > 0}
									<StudentParticipationChart
										sessions={studentParticipationData}
										studentNames={studentParticipationNames}
									/>
								{:else}
									<div class="flex h-64 items-center justify-center text-gray-500">
										<p>{m.noStudentParticipationData()}</p>
									</div>
								{/if}
							{/if}

							<!-- Subtask Completion Chart (show only when NO specific student is selected) -->
							{#if !selectedStudent}
								{#if isLoadingSubtaskData}
									<div class="flex h-64 items-center justify-center">
										<Spinner size="8" />
										<p class="ml-2 text-gray-600">{m.loadingSubtaskData()}</p>
									</div>
								{:else if subtaskCompletionData.length > 0}
									<SubtaskCompletionChart data={subtaskCompletionData} />
								{:else}
									<div class="flex h-64 items-center justify-center text-gray-500">
										<p>{m.noSubtaskCompletionData()}</p>
									</div>
								{/if}
							{/if}

							<!-- Discussion Participation Chart (show only when NO specific student is selected) -->
							{#if !selectedStudent}
								{#if isLoadingDiscussionData}
									<div class="flex h-64 items-center justify-center">
										<Spinner size="8" />
										<p class="ml-2 text-gray-600">{m.loadingDiscussionData()}</p>
									</div>
								{:else if selectedTitles.length === 0}
									<div class="flex h-64 flex-col items-center justify-center text-gray-500">
										<Info size={32} class="mb-2" />
										<p>{m.selectCoursesPlaceholder()}</p>
									</div>
								{:else if discussionParticipationData.length > 0}
									<DiscussionParticipationChart data={discussionParticipationData} />
								{:else}
									<div class="flex h-64 items-center justify-center text-gray-500">
										<p>{m.noDiscussionParticipationData()}</p>
									</div>
								{/if}
							{/if}

							<!-- Single Student Charts (show only when specific student is selected) -->
							{#if selectedStudent}
								<!-- Single Student Participation Chart -->
								{#if isLoadingSingleStudentParticipation}
									<div class="flex h-64 items-center justify-center">
										<Spinner size="8" />
										<p class="ml-2 text-gray-600">{m.loadingStudentParticipationData()}</p>
									</div>
								{:else if singleStudentParticipationData.length > 0}
									{#if selectedStudentName}
										<Card padding="lg" class="w-full !max-w-none">
											<div class="mb-4">
												<div class="mb-3 flex items-center gap-3">
													<div class="rounded-full bg-primary-100 p-2">
														<Activity size={20} class="text-primary-600" />
													</div>
													<h3 class="text-lg font-semibold text-gray-900">
														{selectedStudentName} - {m.chartParticipation()}
													</h3>
												</div>
												<p class="text-sm text-gray-600">
													{#if typeof selectedStudentName === 'string'}
														{m.studentParticipationInDiscussions({
															studentName: selectedStudentName
														})}
													{/if}
												</p>
											</div>
											<SingleStudentParticipationChart
												studentName={selectedStudentName}
												sessions={singleStudentParticipationData}
											/>
										</Card>
									{/if}
								{:else}
									<Card padding="lg" class="w-full !max-w-none">
										<div class="mb-4">
											<div class="mb-3 flex items-center gap-3">
												<div class="rounded-full bg-primary-100 p-2">
													<Activity size={20} class="text-primary-600" />
												</div>
												<h3 class="text-lg font-semibold text-gray-900">
													{selectedStudentName} - {m.chartParticipation()}
												</h3>
											</div>
											<p class="text-sm text-gray-600">
												{#if typeof selectedStudentName === 'string'}
													{m.studentParticipationInDiscussions({
														studentName: selectedStudentName
													})}
												{/if}
											</p>
										</div>
										<div class="flex h-64 items-center justify-center text-gray-500">
											<Info size={32} class="mr-2" />
											<p>{m.noStudentParticipationData()}</p>
										</div>
									</Card>
								{/if}

								<!-- Single Student Subtask Chart -->
								{#if isLoadingSingleStudentSubtask}
									<div class="flex h-64 items-center justify-center">
										<Spinner size="8" />
										<p class="ml-2 text-gray-600">{m.loadingStudentSubtaskData()}</p>
									</div>
								{:else if singleStudentSubtaskData.length > 0}
									{#if selectedStudentName}
										<Card padding="lg" class="w-full !max-w-none">
											<div class="mb-4">
												<div class="mb-3 flex items-center gap-3">
													<div class="rounded-full bg-primary-100 p-2">
														<Target size={20} class="text-primary-600" />
													</div>
													<h3 class="text-lg font-semibold text-gray-900">
														{selectedStudentName} - {m.chartSubtaskCompletion()}
													</h3>
												</div>
												<p class="text-sm text-gray-600">
													{#if typeof selectedStudentName === 'string'}
														{m.studentSubtaskMasteryInDiscussions({
															studentName: selectedStudentName
														})}
													{/if}
												</p>
											</div>
											<SingleStudentSubtaskChart
												studentName={selectedStudentName}
												sessions={singleStudentSubtaskData}
											/>
										</Card>
									{/if}
								{:else}
									<Card padding="lg" class="w-full !max-w-none">
										<div class="mb-4">
											<div class="mb-3 flex items-center gap-3">
												<div class="rounded-full bg-primary-100 p-2">
													<Target size={20} class="text-primary-600" />
												</div>
												<h3 class="text-lg font-semibold text-gray-900">
													{selectedStudentName} - {m.chartSubtaskCompletion()}
												</h3>
											</div>
											<p class="text-sm text-gray-600">
												{#if typeof selectedStudentName === 'string'}
													{m.studentSubtaskMasteryInDiscussions({
														studentName: selectedStudentName
													})}
												{/if}
											</p>
										</div>
										<div class="flex h-64 items-center justify-center text-gray-500">
											<Info size={32} class="mr-2" />
											<p>{m.noStudentSubtaskData()}</p>
										</div>
									</Card>
								{/if}
							{/if}
						</div>
					</Card>
				</div>
			{:else}
				<div class="w-full space-y-6">
					<!-- Participation Chart -->
					{#if isLoadingParticipationData}
						<Card padding="lg" class="w-full !max-w-none">
							<div class="flex h-64 items-center justify-center">
								<Spinner size="8" />
								<p class="ml-2 text-gray-600">{m.loadingParticipationData()}</p>
							</div>
						</Card>
					{:else if selectedTitles.length === 0}
						<!-- No session titles selected placeholder -->
						<Card padding="lg" class="w-full !max-w-none">
							<div class="mb-4">
								<div class="mb-3 flex items-center gap-3">
									<div class="rounded-full bg-primary-100 p-2">
										<Activity size={20} class="text-primary-600" />
									</div>
									<h3 class="text-lg font-semibold text-gray-900">{m.chartClassParticipation()}</h3>
								</div>
								<p class="text-sm text-gray-600">{m.chartClassParticipationDesc()}</p>
							</div>
							<div class="flex h-64 flex-col items-center justify-center text-gray-500">
								<Info size={32} class="mb-2" />
								<p>{m.selectCoursesPlaceholder()}</p>
							</div>
						</Card>
					{:else if participationData.length > 0}
						<ParticipationChart data={participationData} />
					{:else}
						<Card padding="lg" class="w-full !max-w-none">
							<div class="flex h-64 items-center justify-center text-gray-500">
								<p>{m.noClassParticipationData()}</p>
							</div>
						</Card>
					{/if}

					<!-- Discussion Participation Overview -->
					{#if isLoadingDiscussionData}
						<Card padding="lg" class="w-full !max-w-none">
							<div class="flex h-64 items-center justify-center">
								<Spinner size="8" />
								<p class="ml-2 text-gray-600">{m.loadingDiscussionData()}</p>
							</div>
						</Card>
					{:else if selectedTitles.length === 0}
						<Card padding="lg" class="w-full !max-w-none">
							<div class="mb-4">
								<div class="mb-3 flex items-center gap-3">
									<div class="rounded-full bg-primary-100 p-2">
										<MessageSquare size={20} class="text-primary-600" />
									</div>
									<h3 class="text-lg font-semibold text-gray-900">
										{m.chartDiscussionParticipation()}
									</h3>
								</div>
								<p class="text-sm text-gray-600">{m.chartDiscussionParticipationDesc()}</p>
							</div>
							<div class="flex h-64 flex-col items-center justify-center text-gray-500">
								<Info size={32} class="mb-2" />
								<p>{m.selectCoursesPlaceholder()}</p>
							</div>
						</Card>
					{:else if discussionParticipationData.length > 0}
						<DiscussionParticipationChart data={discussionParticipationData} />
					{:else}
						<Card padding="lg" class="w-full !max-w-none">
							<div class="flex h-64 items-center justify-center text-gray-500">
								<p>{m.noDiscussionParticipationData()}</p>
							</div>
						</Card>
					{/if}

					<!-- Word Cloud -->
					<Card padding="lg" class="w-full !max-w-none">
						<div class="mb-4 flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div class="rounded-full bg-primary-100 p-2">
									<BarChart3 size={20} class="text-primary-600" />
								</div>
								<h3 class="text-lg font-semibold text-gray-900">{m.keywordWordCloud()}</h3>
							</div>
						</div>
						<p class="text-sm text-gray-600">{m.wordCloudDesc()}</p>
						<div class="rounded-lg border bg-gray-50 p-4">
							{#if selectedTitles.length === 0}
								<div class="flex h-64 flex-col items-center justify-center text-gray-500">
									<Info size={32} class="mb-2" />
									<p>{m.selectCoursesPlaceholder()}</p>
								</div>
							{:else if isLoadingKeywords}
								<div class="flex h-64 items-center justify-center">
									<Spinner size="8" />
									<p class="ml-2 text-gray-600">{m.loadingKeywords()}</p>
								</div>
							{:else if Object.keys(keywordData).length > 0}
								<div class="h-64">
									<WordCloud words={keywordData} minFontSize={12} maxFontSize={48} />
								</div>
							{:else}
								<div class="flex h-64 items-center justify-center text-gray-500">
									<p>{m.noKeywordData()}</p>
								</div>
							{/if}
						</div>
					</Card>

					<!-- Analytics Panel when no class is selected -->
					<!-- THIS SECTION HAS BEEN MOVED INTO THE CLASS ANALYSIS VIEW -->
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
