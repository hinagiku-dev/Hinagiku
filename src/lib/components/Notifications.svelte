<script lang="ts">
	import { notifications, type NotificationType } from '$lib/stores/notifications';
	import { fly } from 'svelte/transition';
	import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-svelte';

	const icons: Record<NotificationType, typeof CheckCircle> = {
		success: CheckCircle,
		error: XCircle,
		warning: AlertCircle,
		info: Info
	};

	const colors: Record<NotificationType, string> = {
		success: 'bg-green-50 text-green-600 border-green-200',
		error: 'bg-red-50 text-red-600 border-red-200',
		warning: 'bg-yellow-50 text-yellow-600 border-yellow-200',
		info: 'bg-blue-50 text-blue-600 border-blue-200'
	};
</script>

<div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
	{#each $notifications as { id, message, type } (id)}
		<div
			transition:fly={{ x: 100, duration: 300 }}
			class="flex items-center gap-3 rounded-lg border p-4 shadow-lg {colors[type]}"
			role="alert"
		>
			<svelte:component this={icons[type]} class="h-5 w-5" />
			<p>{message}</p>
			<button class="ml-auto" on:click={() => notifications.dismiss(id)} aria-label="Dismiss">
				<XCircle class="h-5 w-5" />
			</button>
		</div>
	{/each}
</div>
