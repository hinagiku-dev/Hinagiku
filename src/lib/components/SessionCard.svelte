<script lang="ts">
	import { Button, Card } from 'flowbite-svelte';
	import ResolveUsername from './ResolveUsername.svelte';
	import { doc, getDoc } from 'firebase/firestore';
	import { db } from '$lib/firebase';
	import * as m from '$lib/paraglide/messages.js';

	let {
		id,
		title,
		status,
		labels,
		task,
		host,
		createdAt,
		classId,
		archived = false
	}: {
		id: string;
		title: string;
		status: string;
		labels?: string[];
		task: string;
		host?: string;
		createdAt: Date;
		classId?: string | null | undefined;
		archived?: boolean;
	} = $props();

	let className = $state<string | null>(null);

	$effect(() => {
		let cancelled = false;

		async function fetchClassName() {
			if (classId && !cancelled) {
				try {
					const classDoc = await getDoc(doc(db, 'classes', classId));
					if (classDoc.exists() && !cancelled) {
						className = classDoc.data().className;
					} else {
						className = null;
					}
				} catch (error) {
					if (!cancelled) {
						console.error('Error fetching class name:', error);
						className = null;
					}
				}
			} else {
				className = null;
			}
		}

		fetchClassName();

		return () => {
			cancelled = true;
		};
	});
</script>

<Card
	padding="lg"
	class="h-full transition-all hover:border-primary-500"
	style={archived ? 'opacity: 0.5' : ''}
>
	<div class="flex h-full flex-col">
		<div class="mb-4 flex items-start justify-between">
			<h3 class="line-clamp-1 text-xl font-bold">{title}</h3>
			<span
				class="ml-2 inline-flex shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium {status ===
				'preparing'
					? 'bg-yellow-100 text-yellow-600'
					: status === 'individual'
						? 'bg-blue-100 text-blue-600'
						: status === 'before-group'
							? 'bg-purple-100 text-purple-600'
							: status === 'group'
								? 'bg-green-100 text-green-600'
								: 'bg-gray-100 text-gray-600'}"
			>
				{status === 'preparing'
					? m.preparingStage()
					: status === 'individual'
						? m.individualStage()
						: status === 'before-group'
							? m.beforeGroupStage()
							: status === 'group'
								? m.groupStage()
								: m.ended()}
			</span>
		</div>
		{#if labels?.length}
			<div class="mb-4 flex min-h-[28px] flex-wrap gap-2">
				{#each labels.sort() as label}
					<span class="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
						{label}
					</span>
				{/each}
			</div>
		{/if}
		<p class="mb-4 line-clamp-2 text-gray-600">{task}</p>
		<div class="mt-auto w-full">
			{#if host}
				<div class="flex items-center gap-4">
					<span class="text-sm text-gray-500">{m.hostedBy()} <ResolveUsername id={host} /></span>
				</div>
			{/if}
			<div class="mb-4 flex items-center justify-between">
				<span class="text-sm text-gray-500">
					{createdAt.toLocaleString()}
				</span>
				{#if className}
					<span class="text-sm text-gray-500">
						{m.Class()} : {className}
					</span>
				{/if}
			</div>

			<Button href="/session/{id}" class="w-full">{m.viewSession()}</Button>
		</div>
	</div>
</Card>
