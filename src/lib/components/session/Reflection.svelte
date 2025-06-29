<script lang="ts">
	import { onMount } from 'svelte';
	import { Textarea, Button } from 'flowbite-svelte';
	import * as m from '$lib/paraglide/messages';
	import { notifications } from '$lib/stores/notifications';
	import type { LearningRecord } from '$lib/schema/learningRecord';
	import { user } from '$lib/stores/auth';

	export let sessionId: string;
	export let groupId: string;
	export let reflectionQuestion: string | undefined;
	export let readonly = false;

	let learningRecordAnswer = '';
	let isSavingLearningRecord = false;
	let learningRecordExists = false;
	let loadingLearningRecord = true;

	onMount(async () => {
		if (!$user || readonly) {
			loadingLearningRecord = false;
			return;
		}
		try {
			const res = await fetch(`/api/session/${sessionId}/group/${groupId}/learningRecords`);
			if (res.ok) {
				const record: LearningRecord = await res.json();
				if (record && record.answer) {
					learningRecordAnswer = record.answer;
					learningRecordExists = true;
				}
			}
		} catch (e) {
			console.error('Failed to load learning record', e);
		} finally {
			loadingLearningRecord = false;
		}
	});

	async function handleSaveLearningRecord() {
		isSavingLearningRecord = true;
		try {
			const res = await fetch(`/api/session/${sessionId}/group/${groupId}/learningRecords`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ answer: learningRecordAnswer })
			});
			if (res.ok) {
				notifications.success(m.learningRecordSaved());
				learningRecordExists = true;
			} else {
				notifications.error(m.failedToSaveLearningRecord());
			}
		} catch (e) {
			console.error('Failed to save learning record', e);
			notifications.error(m.failedToSaveLearningRecord());
		} finally {
			isSavingLearningRecord = false;
		}
	}
</script>

{#if !loadingLearningRecord}
	<div class="mt-6">
		<h2 class="text-xl font-semibold">{m.reflectionQuestion()}</h2>
		<p class="mb-4 text-gray-700 dark:text-gray-400">
			{reflectionQuestion || '你本次討論最大的收穫是甚麼?'}
		</p>
		<Textarea
			bind:value={learningRecordAnswer}
			placeholder={m.reflectionPlaceholder()}
			rows={5}
			maxlength={30000}
			class="w-full rounded-lg border p-4 text-gray-700"
			disabled={readonly}
		/>
		{#if !readonly}
			<Button on:click={handleSaveLearningRecord} disabled={isSavingLearningRecord} class="mt-4">
				{isSavingLearningRecord
					? m.saving()
					: learningRecordExists
						? m.updateReflection()
						: m.saveReflection()}
			</Button>
		{/if}
	</div>
{/if}
