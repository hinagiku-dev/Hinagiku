<script lang="ts">
	import { notifications } from '$lib/stores/notifications';
	import QRCode from '$lib/components/QRCode.svelte';
	import { Card, Button } from 'flowbite-svelte';
	import { RefreshCw, Eye, EyeOff } from 'lucide-svelte';
	import Title from '$lib/components/Title.svelte';
	import * as m from '$lib/paraglide/messages.js';

	// Mock data for student list
	let student_list = Array.from({ length: 99 }).map((_, i) => ({
		id: i + 1,
		name: `Student ${i + 1}`,
		seatNumber: `A${i + 1}`,
		groupNumber: `${(i % 4) + 1}`,
		studentId: `S123${117 + i}`
	}));

	// Mock class code
	const classCode = 'ABC123';

	// Page size and pagination
	let currentPage = 1;
	const pageSize = 8;
	$: totalPages = Math.ceil(student_list.length / pageSize);
	$: paginated = student_list.slice((currentPage - 1) * pageSize, currentPage * pageSize);

	function prevPage() {
		if (currentPage > 1) currentPage -= 1;
	}
	function nextPage() {
		if (currentPage < totalPages) currentPage += 1;
	}

	// Reset Password editing state
	let editingId: number | null = null;
	let passwordInput = '';
	let showPassword = false;

	function startEdit(id: number) {
		editingId = id;
		passwordInput = '';
		showPassword = false;
	}
	function cancelEdit() {
		editingId = null;
		passwordInput = '';
		showPassword = false;
	}

	// Reset password (fallback)
	async function resetPassword(id: string) {
		try {
			const res = await fetch('/api/reset-password-class', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ studentId: id })
			});
			notifications[res.ok ? 'success' : 'error'](
				`${m.resetPasswordClass()} ${id} ${m.resetPasswordClassofPassword()} ${res.ok ? m.resetPasswordClassSuccess() : m.resetPasswordClassFailed()}`
			);
		} catch (e) {
			console.error(e);
			notifications.error(m.resetPasswordClassError());
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
		if (!['csv', 'xls', 'xlsx'].includes(ext)) {
			notifications.error(m.importStdentListFailedTypeNotSupported());
			return;
		}
		const form = new FormData();
		form.append('file', file);
		try {
			const res = await fetch('/api/import-student-list', { method: 'POST', body: form });
			if (!res.ok) throw new Error(res.statusText);
			const data = await res.json();
			if (Array.isArray(data.student_list)) {
				student_list = data.student_list;
				currentPage = 1;
				notifications.success(
					`${m.importStdentListSuccess1()} ${student_list.length} ${m.importStdentListSuccess2()}`
				);
			} else {
				throw new Error(m.importStdentListFailedInvalidReturned());
			}
		} catch (err) {
			console.error(err);
			notifications.error(m.importStdentListFailed());
		} finally {
			input.value = '';
		}
	}
</script>

<Title page="Credential Management" />

<main class="w-full pb-16 pt-6">
	<div class="mx-auto flex max-w-7xl flex-col gap-6 px-4 md:flex-row">
		<!-- Left side: Credential Management -->
		<aside class="w-full space-y-6 md:w-1/3">
			<div>
				<h1 class="mb-2 text-3xl font-bold">{m.credentialManagement()}</h1>
				<p class="text-gray-600">{m.credentialManagementDesc()}</p>
			</div>
			<div class="flex flex-col space-y-4">
				<Button color="primary" class="w-2/4" on:click={triggerFileImport}>
					{m.importStudentListButton()}
				</Button>
				<input
					type="file"
					accept={acceptTypes.join(',')}
					bind:this={fileInput}
					class="hidden"
					on:change={handleFileChange}
				/>
				<Card padding="xl" class="flex flex-col items-center">
					<h2 class="mb-4 text-xl font-semibold">{m.qrcodeClassAccess()}</h2>
					<QRCode value={`/login?classCode=${classCode}`} />
					<p class="mt-4 text-lg font-bold">{m.classCodeTitle()}: {classCode}</p>
				</Card>
			</div>
		</aside>

		<!-- Right side: Student List -->
		<section class="flex w-full flex-col md:w-2/3">
			<div class="border-b border-gray-200 p-5">
				<h2 class="text-xl font-semibold">{m.studentList()}</h2>
			</div>
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
								<td class="px-6 py-4">{s.name}</td>
								<td class="px-6 py-4">{s.seatNumber}</td>
								<td class="px-6 py-4">{s.studentId}</td>
								<td class="px-6 py-4">{s.groupNumber}</td>
								<td class="px-6 py-4">
									{#if editingId === s.id}
										<div class="flex items-center space-x-2">
											<input
												type={showPassword ? 'text' : 'password'}
												bind:value={passwordInput}
												class="w-32 rounded border px-2 py-1"
												placeholder={m.newPasswordClass()}
											/>
											<button
												type="button"
												on:click={() => (showPassword = !showPassword)}
												class="text-gray-500 hover:text-gray-700"
											>
												{#if showPassword}
													<EyeOff class="h-5 w-5" />
												{:else}
													<Eye class="h-5 w-5" />
												{/if}
											</button>
											<Button size="xs" on:click={() => resetPassword(s.studentId)}>
												{m.applyPasswordClass()}
											</Button>
											<Button size="xs" outline on:click={cancelEdit}>
												{m.backPasswordClass()}
											</Button>
										</div>
									{:else}
										<Button size="xs" outline class="w-auto" on:click={() => startEdit(s.id)}>
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
					on:click={prevPage}
					disabled={currentPage === 1}>{m.studentListPreviousPage()}</button
				>
				<span>Page {currentPage} of {totalPages}</span>
				<button
					class="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
					on:click={nextPage}
					disabled={currentPage === totalPages}>{m.studentListNextPage()}</button
				>
			</div>
		</section>
	</div>
</main>
