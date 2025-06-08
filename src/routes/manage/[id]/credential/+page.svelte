<script lang="ts">
	import { notifications } from '$lib/stores/notifications';
	import QRCode from '$lib/components/QRCode.svelte';
	import { Card, Button, Spinner, Input } from 'flowbite-svelte';
	import { RefreshCw, ArrowLeft, Eye, EyeOff } from 'lucide-svelte';
	import Title from '$lib/components/Title.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import * as XLSX from 'xlsx';
	import { db } from '$lib/firebase';
	import { getDoc, doc } from 'firebase/firestore';
	import type { Class } from '$lib/schema/class';
	import { StudentSchema } from '$lib/schema/class';
	import { page } from '$app/stores';
	import type { z } from 'zod';
	import type { Profile } from '$lib/schema/profile.js';

	// Use the schema type directly
	type Student = z.infer<typeof StudentSchema>;

	// Get data from server
	let { data } = $props();
	const classId = data.classId; // This is the internal class ID

	// Get the origin (base URL) from the page store
	const origin = $page.url.origin;

	// State data
	let isLoadingClass = $state(true);
	let classData = $state<Class | null>(null);
	let classCode = $state(''); // This will hold the display code
	let students = $state<string[]>([]);

	async function loadData() {
		try {
			isLoadingClass = true;
			const classRef = doc(db, 'classes', classId);
			const classSnapshot = await getDoc(classRef);

			if (classSnapshot.exists()) {
				classData = classSnapshot.data() as Class;
				classCode = classData.code; // Use the display code from class data
				students = classData.students;
				console.log('Students in class:', students);

				// Load profile data for each student and update student_list
				const studentProfiles: Student[] = [];

				for (const studentId of students) {
					try {
						const profileRef = doc(db, 'profiles', studentId);
						const profileSnapshot = await getDoc(profileRef);

						if (profileSnapshot.exists()) {
							const profileData = profileSnapshot.data() as Profile;

							// Find student's group from the loaded classGroups
							let studentGroup: string | null = null;
							for (const group of classData.groups) {
								if (group.students.includes(studentId)) {
									studentGroup = group.number.toString();
									break;
								}
							}

							// Create student object matching StudentSchema
							const studentData: Student = {
								displayName: profileData.displayName,
								studentId: profileData.studentId || '',
								seatNumber: profileData.seatNumber || null,
								group: studentGroup
							};

							studentProfiles.push(studentData);
						} else {
							console.warn(`Profile not found for student: ${studentId}`);
						}
					} catch (error) {
						console.error(`Error loading profile for student ${studentId}:`, error);
					}
				}

				// Update the student list
				student_list = studentProfiles;
				console.log('Loaded student profiles:', studentProfiles);
			} else {
				notifications.error(m.failedToLoadClassData());
			}
		} catch (error) {
			console.error('Error loading class data:', error);
			notifications.error(m.failedToLoadClassData());
		} finally {
			isLoadingClass = false;
		}
	}

	// Load class data on component initialization
	loadData();

	let student_list = $state<Student[]>([]);

	// Page size and pagination
	let currentPage = $state(1);
	const pageSize = 8;
	let totalPages = $state(1);
	$effect(() => {
		totalPages = Math.ceil(student_list.length / pageSize);
	});

	let paginated = $state<Student[]>([]);
	$effect(() => {
		paginated = student_list.slice((currentPage - 1) * pageSize, currentPage * pageSize);
	});

	function prevPage() {
		if (currentPage > 1) currentPage -= 1;
	}
	function nextPage() {
		if (currentPage < totalPages) currentPage += 1;
	}

	// Reset Password editing state - track confirmation and password input
	let confirmingResetId = $state<string | null>(null);
	let resetPasswordValue = $state<string>('');
	let showPassword = $state<boolean>(false);

	// Group editing state - track confirmation and group input
	let editingGroupId = $state<string | null>(null);
	let groupValue = $state<string>('');

	function confirmReset(studentId: string) {
		confirmingResetId = studentId;
		resetPasswordValue = studentId; // Default to student ID
		showPassword = false; // Reset visibility
	}

	function cancelReset() {
		confirmingResetId = null;
		resetPasswordValue = '';
		showPassword = false;
	}

	function togglePasswordVisibility() {
		showPassword = !showPassword;
	}

	// Group editing functions
	function editGroup(studentId: string, currentGroup: string | null) {
		editingGroupId = studentId;
		groupValue = currentGroup || '';
	}

	function cancelGroupEdit() {
		editingGroupId = null;
		groupValue = '';
	}

	// Validate group value - must be a number >= 1
	function isValidGroup(value: string): boolean {
		const num = parseInt(value.trim());
		return !isNaN(num) && num >= 1;
	}

	// Update group - call API with new group
	async function updateGroup(studentId: string) {
		if (!groupValue.trim() || !isValidGroup(groupValue)) {
			notifications.error(m.groupMustBeNumber());
			return;
		}

		// Find the student's UID from the students array
		const studentUid = students.find((uid) => {
			const student = student_list.find((s) => s.studentId === studentId);
			return student && students.includes(uid);
		});

		if (!studentUid) {
			notifications.error('Student UID not found');
			return;
		}

		try {
			const res = await fetch('/api/auth/update-group', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					classId: classId,
					studentId: studentUid,
					groupsData: student_list.map((student) => ({
						displayName: student.displayName,
						studentId: student.studentId,
						seatNumber: student.seatNumber,
						group: student.studentId === studentId ? groupValue.trim() : student.group
					}))
				})
			});

			if (res.ok) {
				const data = await res.json();
				console.log('Update group response:', data);

				// Update the local student list
				student_list = student_list.map((student) =>
					student.studentId === studentId ? { ...student, group: groupValue.trim() } : student
				);

				notifications.success(`${studentId} group updated successfully`);
			} else {
				const errorData = await res.json();
				console.error('Update group error:', errorData);
				notifications.error(`Failed to update group for ${studentId}`);
			}
		} catch (e) {
			console.error(e);
			notifications.error('Error updating group');
		} finally {
			editingGroupId = null;
			groupValue = '';
		}
	}

	// Reset password - call API with custom password
	async function resetPassword(studentId: string) {
		if (!resetPasswordValue.trim()) {
			notifications.error('Password cannot be empty');
			return;
		}

		try {
			const res = await fetch('/api/auth/update-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					classId: classId,
					studentId: studentId,
					newPassword: resetPasswordValue.trim()
				})
			});

			if (res.ok) {
				const data = await res.json();
				console.log('Reset password response:', data);
				notifications.success(`${studentId} ${m.classStudentResetPasswordSuccess()}`);
			} else {
				const errorData = await res.json();
				console.error('Reset password error:', errorData);
				notifications.error(`${studentId} ${m.classStudentResetPasswordFailed()}`);
			}
		} catch (e) {
			console.error(e);
			notifications.error(m.resetPasswordClassError());
		} finally {
			confirmingResetId = null;
			resetPasswordValue = '';
			showPassword = false;
		}
	}

	// CSV/Excel file import
	let fileInput: HTMLInputElement;
	const acceptTypes = ['.csv', '.xls', '.xlsx'];

	function triggerFileImport() {
		fileInput.click();
	}

	async function handleFileChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
		if (!acceptTypes.includes(`.${ext}`)) {
			notifications.error(m.importStdentListFailedTypeNotSupported());
			return;
		}

		// Improved field structure validation
		try {
			const requiredFields = [
				{
					keys: ['name', 'student name', '姓名', 'displayname', 'display name'],
					found: false,
					index: -1
				},
				{ keys: ['seat', 'seatnumber', 'seat number', '座號'], found: false, index: -1 },
				{ keys: ['id', 'studentid', 'student id', '學號'], found: false, index: -1 },
				{ keys: ['group', 'groupnumber', 'group number', '組別'], found: false, index: -1 }
			];
			let headers: string[] = [];
			let rows: (string | number | boolean | null)[][] = [];

			// Parse file and extract headers and data
			if (ext === 'csv') {
				const text = await file.text();
				const lines = text.split(/\r?\n/).filter((line) => line.trim());
				if (lines.length > 0) {
					// Parse headers
					const firstLine = lines[0];
					let inQuote = false;
					let currentHeader = '';
					const parsedHeaders = [];

					for (let i = 0; i < firstLine.length; i++) {
						const char = firstLine[i];
						if (char === '"') {
							inQuote = !inQuote;
						} else if (char === ',' && !inQuote) {
							parsedHeaders.push(currentHeader.trim());
							currentHeader = '';
						} else {
							currentHeader += char;
						}
					}
					// Add the last header
					if (currentHeader) parsedHeaders.push(currentHeader.trim());
					headers = parsedHeaders;

					// Parse data rows
					for (let i = 1; i < lines.length; i++) {
						const line = lines[i];
						const rowValues = [];
						inQuote = false;
						let currentValue = '';

						for (let j = 0; j < line.length; j++) {
							const char = line[j];
							if (char === '"') {
								inQuote = !inQuote;
							} else if (char === ',' && !inQuote) {
								rowValues.push(currentValue.trim());
								currentValue = '';
							} else {
								currentValue += char;
							}
						}
						// Add the last value
						if (currentValue) rowValues.push(currentValue.trim());
						rows.push(rowValues);
					}
				}
			} else {
				// Excel files
				const data = new Uint8Array(await file.arrayBuffer());
				const wb = XLSX.read(data, { type: 'array' });
				const sheet = wb.Sheets[wb.SheetNames[0]];
				const sheetData: (string | number | boolean | null)[][] = XLSX.utils.sheet_to_json(sheet, {
					header: 1
				});
				if (sheetData.length > 0) {
					headers = (sheetData[0] || []).map((h) => String(h).trim());
					rows = sheetData.slice(1).filter((row) => row.length > 0);
				}
			}

			// Case-insensitive validation
			const normalizedHeaders = headers.map((h) => h.toLowerCase());
			console.log('Detected headers:', normalizedHeaders);

			// Find column indices for required fields
			for (const field of requiredFields) {
				for (const key of field.keys) {
					const index = normalizedHeaders.indexOf(key.toLowerCase());
					if (index !== -1) {
						field.found = true;
						field.index = index;
						break;
					}
				}
			}

			// Check each required field
			let missingFields = [];
			for (const field of requiredFields) {
				if (!field.found) {
					missingFields.push(field.keys[0]);
				}
			}

			if (missingFields.length > 0) {
				throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
			}

			// Extract student data directly from parsed rows and validate with StudentSchema
			const newStudentList: Student[] = [];
			const validationErrors: string[] = [];
			const seenStudentIds = new Set<string>();
			const seenSeatNumbers = new Set<string>();
			let hasDuplicates = false;

			// First pass: Check for duplicates and required fields
			for (let idx = 0; idx < rows.length; idx++) {
				const row = rows[idx];

				// Check if all required fields have data
				const displayName = String(row[requiredFields[0].index] || '').trim();
				const studentIdValue = String(row[requiredFields[2].index] || '').trim();
				const seatNumberValue = String(row[requiredFields[1].index] || '').trim();
				const groupValue = String(row[requiredFields[3].index] || '').trim();

				// Validate required fields are not empty
				if (!displayName || !studentIdValue || !seatNumberValue || !groupValue) {
					validationErrors.push(
						`Row ${idx + 2}: All fields (name, student ID, seat number, group) are required and cannot be empty`
					);
					continue;
				}

				// Check if student ID length is >= 6
				if (studentIdValue.length < 6) {
					validationErrors.push(
						`Row ${idx + 2}: Student ID "${studentIdValue}" ${m.classImportStudentsIDLength()}`
					);
					continue;
				}

				// Check for duplicate student ID
				if (seenStudentIds.has(studentIdValue)) {
					validationErrors.push(`Duplicate student ID "${studentIdValue}" found at row ${idx + 2}`);
					hasDuplicates = true;
				} else {
					seenStudentIds.add(studentIdValue);
				}

				// Check for duplicate seat number
				if (seenSeatNumbers.has(seatNumberValue)) {
					validationErrors.push(
						`Duplicate seat number "${seatNumberValue}" found at row ${idx + 2}`
					);
					hasDuplicates = true;
				} else {
					seenSeatNumbers.add(seatNumberValue);
				}
			}

			// If there are any validation errors or duplicates, reject the entire file
			if (validationErrors.length > 0 || hasDuplicates) {
				throw new Error('File contains duplicate or invalid data');
			}

			// Second pass: Process valid data only if no duplicates found
			for (let idx = 0; idx < rows.length; idx++) {
				const row = rows[idx];
				try {
					const displayName = String(row[requiredFields[0].index] || '').trim();
					const studentIdValue = String(row[requiredFields[2].index] || '').trim();
					const seatNumberValue = String(row[requiredFields[1].index] || '').trim();
					const groupValue = String(row[requiredFields[3].index] || '').trim();

					// Create a student object according to schema
					const studentData = {
						displayName: displayName,
						studentId: studentIdValue,
						seatNumber: seatNumberValue,
						group: groupValue
					};

					// Validate with Zod schema
					const validatedStudent = StudentSchema.parse(studentData);

					// Add directly to the list
					newStudentList.push(validatedStudent);
				} catch (validationError) {
					console.error(`Row ${idx + 2} validation failed:`, validationError);
					// This shouldn't happen if first pass worked correctly
				}
			}

			// Update student list only if all validations passed
			if (newStudentList.length > 0) {
				student_list = newStudentList;
				totalPages = Math.ceil(student_list.length / pageSize);
				paginated = student_list.slice(0, pageSize);
				currentPage = 1;
				notifications.success(
					`${m.importStdentListSuccess1()} ${student_list.length} ${m.importStdentListSuccess2()}`
				);
			} else {
				throw new Error('Cannot find any valid student data in the file');
			}

			// Send to server in the format expected by the API
			try {
				// Pass the validated student list directly - no need to extract fields
				const res = await fetch(`/api/class/${classId}/import-student`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ students: student_list })
				});
				if (res.ok) {
					const data = await res.json();
					if (data.success) {
						notifications.success(m.classImportSuccess());
					} else {
						notifications.error(m.classImportFailed());
					}
				} else {
					notifications.error(m.classImportServerError());
				}
			} catch (error) {
				console.error('API error:', error);
				notifications.error(m.classImportServerErrorDataShown());
			}
		} catch (error) {
			console.error('File validation error:', error);
			let errorMessage = m.classStudentFormatErrorInclude();
			if (error instanceof Error && error.message.includes('Missing required fields')) {
				errorMessage = error.message;
			}
			notifications.error(errorMessage);
		} finally {
			input.value = '';
		}
	}
</script>

<Title page="Credential Management" />

<main class="w-full pb-16 pt-6">
	<div class="mx-auto max-w-7xl px-4">
		<!-- Header with back button -->
		<div class="mb-6 flex items-center justify-between">
			<div class="flex-1">
				<h1 class="mb-2 text-3xl font-bold">{m.credentialManagement()}</h1>
				<p class="text-gray-600">{m.credentialManagementDesc()}</p>
			</div>
			<div class="flex-shrink-0">
				<Button href="/manage?classId={classId}" color="alternative">
					<ArrowLeft class="mr-2 h-4 w-4" />
					{m.backToManagementDashboard()}
				</Button>
			</div>
		</div>

		<div class="flex flex-col gap-6 md:flex-row">
			<!-- Left side: Credential Management -->
			<aside class="w-full space-y-6 md:w-1/3">
				<div class="flex flex-col space-y-4">
					<Button color="primary" class="w-2/4" onclick={triggerFileImport}>
						{m.importStudentListButton()}
					</Button>
					<input
						type="file"
						accept={acceptTypes.join(',')}
						bind:this={fileInput}
						class="hidden"
						onchange={handleFileChange}
					/>
					<Card padding="xl" class="flex flex-col items-center">
						<h2 class="mb-4 text-xl font-semibold">{m.qrcodeClassAccess()}</h2>
						{#if isLoadingClass}
							<Spinner size="8" />
						{:else}
							<QRCode value={`${origin}/login?classCode=${classCode}`} />
							<p class="mt-4 text-lg font-bold">{m.classCodeTitle()}: {classCode}</p>
						{/if}
					</Card>
				</div>
			</aside>

			<!-- Right side: Student List -->
			<section class="flex w-full flex-col md:w-2/3">
				<div class="border-b border-gray-200 p-5">
					<h2 class="text-xl font-semibold">{m.studentList()}</h2>
				</div>

				{#if student_list.length === 0}
					<div class="flex flex-col items-center justify-center py-16">
						<div class="text-center">
							<h3 class="mb-2 text-lg font-medium text-gray-900">{m.noStudentListAvailable()}</h3>
							<p class="mb-4 text-gray-600">
								{m.noStudentListDesc()}
							</p>
						</div>
					</div>
				{:else}
					<div class="overflow-x-auto">
						<table class="w-full text-left text-sm text-gray-500">
							<thead class="bg-gray-50 text-xs uppercase text-gray-700">
								<tr>
									<th class="px-6 py-3">{m.studentListName()}</th>
									<th class="px-6 py-3">{m.studentListSeat()}</th>
									<th class="px-6 py-3">{m.studentListID()}</th>
									<th class="px-6 py-3">{m.studentListGroup()}</th>
									<th class="px-6 py-3">{m.studentListAction()}</th>
								</tr>
							</thead>
							<tbody>
								{#each paginated as s, i}
									<tr class={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
										<td class="px-6 py-4">{s.displayName}</td>
										<td class="px-6 py-4">{s.seatNumber}</td>
										<td class="px-6 py-4">{s.studentId}</td>
										<td class="px-6 py-4">
											{#if editingGroupId === s.studentId}
												<div class="flex items-center space-x-2">
													<div class="relative">
														<Input
															type="text"
															bind:value={groupValue}
															placeholder={m.enterGroup()}
															class="w-20"
															size="sm"
														/>
														{#if groupValue.trim() && !isValidGroup(groupValue)}
															<div
																class="absolute left-0 top-full z-10 mt-1 whitespace-nowrap rounded bg-red-500 px-2 py-1 text-xs text-white shadow-lg"
															>
																{m.groupMustBeHigher()}
															</div>
														{/if}
													</div>
													<Button
														size="xs"
														color="blue"
														disabled={!groupValue.trim() || !isValidGroup(groupValue)}
														onclick={() => updateGroup(s.studentId)}
													>
														{m.classGroupEditConfirm()}
													</Button>
													<Button size="xs" outline onclick={cancelGroupEdit}
														>{m.classGroupEditCancel()}</Button
													>
												</div>
											{:else}
												<div class="flex items-center space-x-2">
													<Input
														type="text"
														value={s.group || ''}
														placeholder={m.noGroup()}
														class="w-20"
														size="sm"
														disabled
													/>
													<Button size="xs" outline onclick={() => editGroup(s.studentId, s.group)}>
														{m.editGroup()}
													</Button>
												</div>
											{/if}
										</td>
										<td class="px-6 py-4">
											{#if confirmingResetId === s.studentId}
												<div class="flex flex-col space-y-2">
													<div class="flex items-center space-x-2">
														<div class="relative w-32">
															<Input
																type={showPassword ? 'text' : 'password'}
																bind:value={resetPasswordValue}
																placeholder={m.enterNewPassword()}
																class="pr-10"
																size="sm"
															/>
															<button
																type="button"
																class="absolute inset-y-0 right-0 flex items-center pr-3"
																onclick={togglePasswordVisibility}
															>
																{#if showPassword}
																	<EyeOff class="h-4 w-4 text-gray-400" />
																{:else}
																	<Eye class="h-4 w-4 text-gray-400" />
																{/if}
															</button>
															{#if resetPasswordValue.trim().length > 0 && resetPasswordValue.trim().length < 6}
																<div
																	class="absolute left-0 top-full z-10 mt-1 whitespace-nowrap rounded bg-red-500 px-2 py-1 text-xs text-white shadow-lg"
																>
																	{m.passwordLengthMinSix()}
																</div>
															{/if}
														</div>
														<Button
															size="xs"
															color="red"
															disabled={resetPasswordValue.trim().length < 6}
															onclick={() => resetPassword(s.studentId)}
														>
															{m.classResetPasswordConfirm()}
														</Button>
														<Button size="xs" outline onclick={cancelReset}>
															{m.classResetPasswordCancel()}
														</Button>
													</div>
												</div>
											{:else}
												<Button
													size="xs"
													outline
													class="w-auto"
													onclick={() => confirmReset(s.studentId)}
												>
													<RefreshCw class="mr-1 h-4 w-4" />
													{m.studentListResetPassword()}
												</Button>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>

					<!-- Pagination -->
					<div class="mt-4 flex items-center justify-center space-x-4">
						<button
							class="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
							onclick={prevPage}
							disabled={currentPage === 1}>{m.studentListPreviousPage()}</button
						>
						<span>{m.page({ current: currentPage, total: totalPages })}</span>
						<button
							class="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
							onclick={nextPage}
							disabled={currentPage === totalPages}>{m.studentListNextPage()}</button
						>
					</div>
				{/if}
			</section>
		</div>
	</div>
</main>
