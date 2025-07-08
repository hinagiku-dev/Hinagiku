/**
 * Notification System Store
 * 
 * This module provides a reactive notification system for the Hinagiku educational
 * platform. It manages toast-style notifications that inform users about system
 * events, operation results, and important messages throughout the application.
 * 
 * Features:
 * - Multiple notification types (success, error, warning, info)
 * - Automatic dismissal with configurable timeouts
 * - Manual dismissal capability
 * - Reactive updates using Svelte stores
 * - Convenience methods for common notification types
 * - Unique ID generation for tracking
 * 
 * Common Use Cases:
 * - Success confirmations for user actions
 * - Error messages for failed operations
 * - Warning alerts for important information
 * - Status updates for ongoing processes
 * - Educational feedback and guidance
 * 
 * @fileoverview Reactive notification system for user feedback and system messages
 */

import { writable } from 'svelte/store';

/**
 * Available notification types with semantic meaning for different contexts.
 * Each type typically corresponds to different visual styling and urgency levels.
 */
export type NotificationType = 'success' | 'error' | 'info' | 'warning';

/**
 * Individual notification data structure.
 * Each notification has a unique identifier, type classification, message content,
 * and optional timeout for automatic dismissal.
 */
export interface Notification {
	/** Unique identifier for tracking and dismissal operations */
	id: string;
	/** Visual and semantic type of the notification */
	type: NotificationType;
	/** The message content to display to the user */
	message: string;
	/** Optional timeout in milliseconds for automatic dismissal */
	timeout?: number;
}

/**
 * Creates the notification store with management functions.
 * Provides reactive access to the notification list and functions for
 * adding, removing, and managing notifications throughout their lifecycle.
 */
function createNotificationStore() {
	const { subscribe, update } = writable<Notification[]>([]);

	/**
	 * Sends a new notification to the store.
	 * Generates a unique ID and adds the notification to the reactive list.
	 * Optionally sets up automatic dismissal after the specified timeout.
	 * 
	 * @param message - The notification message to display
	 * @param type - The type of notification (affects styling and semantics)
	 * @param timeout - Milliseconds after which to auto-dismiss (0 = no auto-dismiss)
	 */
	function send(message: string, type: NotificationType = 'info', timeout = 3000) {
		const id = crypto.randomUUID();

		// Add notification to the reactive store
		update((notifications) => [...notifications, { id, type, message }]);

		// Set up automatic dismissal if timeout is specified
		if (timeout) {
			setTimeout(() => {
				dismiss(id);
			}, timeout);
		}
	}

	/**
	 * Removes a notification from the store by its unique identifier.
	 * Used for both manual dismissal (user clicks close) and automatic timeout dismissal.
	 * 
	 * @param id - Unique identifier of the notification to remove
	 */
	function dismiss(id: string) {
		update((notifications) => notifications.filter((notification) => notification.id !== id));
	}

	return {
		subscribe,
		send,
		dismiss,
		
		// Convenience methods for common notification types
		/** Shows a success notification (typically green, celebratory) */
		success: (msg: string, timeout?: number) => send(msg, 'success', timeout),
		
		/** Shows an error notification (typically red, urgent) */
		error: (msg: string, timeout?: number) => send(msg, 'error', timeout),
		
		/** Shows a warning notification (typically yellow/orange, cautionary) */
		warning: (msg: string, timeout?: number) => send(msg, 'warning', timeout),
		
		/** Shows an info notification (typically blue, informational) */
		info: (msg: string, timeout?: number) => send(msg, 'info', timeout)
	};
}

/**
 * Global notification store instance.
 * Use this throughout the application to send and manage notifications.
 * 
 * @example
 * ```ts
 * import { notifications } from '$lib/stores/notifications';
 * 
 * // Success notification
 * notifications.success('Session created successfully!');
 * 
 * // Error with custom timeout
 * notifications.error('Failed to save data', 5000);
 * 
 * // Info notification that doesn't auto-dismiss
 * notifications.info('Welcome to Hinagiku!', 0);
 * ```
 */
export const notifications = createNotificationStore();
