<!--
@fileoverview
Toast notification display component for the Hinagiku educational platform.

This component provides a user-friendly notification system that displays
temporary messages to users for various platform interactions. It supports
multiple notification types with appropriate visual styling and icons.

Features:
- Multiple notification types (success, error, warning, info)
- Smooth fly-in animations using Svelte transitions
- Color-coded visual design with semantic meaning
- Manual dismissal functionality for user control
- Fixed positioning for consistent visibility
- Accessible design with proper ARIA labels and roles
- Auto-stacking for multiple simultaneous notifications

The component integrates with the global notifications store to display
messages from throughout the application, providing consistent user feedback
for educational activities, form submissions, and system status updates.

Usage:
This component should be placed once in the root layout to handle all
notifications across the entire application.
-->

<script lang="ts">
	import { notifications, type NotificationType } from '$lib/stores/notifications';
	import { fly } from 'svelte/transition';
	import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-svelte';

	/**
	 * Icon mapping for different notification types.
	 * Provides semantic visual cues for different message types.
	 */
	const icons: Record<NotificationType, typeof CheckCircle> = {
		success: CheckCircle,
		error: XCircle,
		warning: AlertCircle,
		info: Info
	};

	/**
	 * Color scheme mapping for different notification types.
	 * Uses consistent color coding throughout the platform for semantic meaning.
	 */
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
