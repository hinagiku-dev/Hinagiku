/**
 * @fileoverview
 * Announcement system store for the Hinagiku educational platform.
 * 
 * This module provides a reactive announcement system that allows broadcasting
 * important messages to users throughout the application. The system includes:
 * - Dynamic announcement creation with random vibrant colors
 * - Persistent user preferences for announcement visibility
 * - Browser-safe localStorage integration
 * - Manual dismissal with preference persistence
 * 
 * Features:
 * - Random color generation for visual variety
 * - Unique ID generation for each announcement
 * - localStorage persistence for user preferences
 * - Graceful degradation for non-browser environments
 * - Simple API for broadcasting, canceling, and dismissing announcements
 * 
 * The announcement store is designed for system-wide notifications such as
 * maintenance announcements, feature updates, or important educational
 * platform notifications.
 * 
 * @example
 * ```ts
 * import { announcement } from '$lib/stores/announcement';
 * 
 * // Broadcast a new announcement
 * announcement.broadcast('Welcome to the new version!');
 * 
 * // Check if announcements should be shown
 * if (announcement.shouldShow()) {
 *   // Show announcement UI
 * }
 * 
 * // Dismiss announcement permanently
 * announcement.dismiss();
 * ```
 */

import { browser } from '$app/environment';
import { writable } from 'svelte/store';

/** localStorage key for persisting announcement visibility preferences */
const SHOW_ANNOUNCEMENT_KEY = 'hinagiku-show-announcement';

/**
 * Interface defining the structure of an announcement object.
 */
export interface Announcement {
	/** Unique identifier for the announcement */
	id: string;
	/** Message content to display to users */
	message: string;
	/** Whether the announcement is currently active */
	active: boolean;
	/** Color scheme for the announcement display */
	color: string;
}

/**
 * Creates the announcement store with management functions.
 * 
 * Provides a reactive store for announcement data along with functions
 * to broadcast new announcements, manage visibility preferences, and
 * handle user interactions with dismissal.
 * 
 * @returns Object containing store subscription and management functions
 */
function createAnnouncementStore() {
	const { subscribe, update, set } = writable<Announcement | null>(null);

	/**
	 * Broadcasts a new announcement with random styling.
	 * 
	 * Creates a new announcement with a vibrant random color and unique ID.
	 * Automatically sets localStorage to show announcements when broadcasting.
	 * 
	 * @param message - Text message to display in the announcement
	 */
	function broadcast(message: string) {
		if (!browser) return;

		// Enable announcement visibility when broadcasting
		localStorage.setItem(SHOW_ANNOUNCEMENT_KEY, 'true');

		// Generate a random vibrant color for visual appeal
		const hue = Math.floor(Math.random() * 360);
		const color = `hsl(${hue}, 100%, 60%)`;

		// Generate a unique identifier for the announcement
		const id = browser ? crypto.randomUUID() : Date.now().toString();

		update(() => ({
			id,
			message,
			active: true,
			color
		}));
	}

	/**
	 * Cancels the current announcement without affecting user preferences.
	 * 
	 * Removes the announcement from display but doesn't change the user's
	 * preference for showing future announcements.
	 */
	function cancel() {
		set(null);
	}

	/**
	 * Dismisses the announcement and saves user preference.
	 * 
	 * Permanently dismisses the current announcement and saves the user's
	 * preference to not show announcements in localStorage.
	 */
	function dismiss() {
		// Save user preference to not show announcements
		if (browser) {
			localStorage.setItem(SHOW_ANNOUNCEMENT_KEY, 'false');
		}
		set(null);
	}

	/**
	 * Checks if announcements should be displayed based on user preferences.
	 * 
	 * Reads from localStorage to determine if the user has chosen to hide
	 * announcements. Defaults to showing announcements if no preference is set.
	 * 
	 * @returns True if announcements should be shown, false otherwise
	 */
	function shouldShow(): boolean {
		if (!browser) return false;
		const value = localStorage.getItem(SHOW_ANNOUNCEMENT_KEY);
		return value !== 'false'; // Default to true if not set
	}

	return {
		subscribe,
		broadcast,
		cancel,
		dismiss,
		shouldShow
	};
}

/**
 * Global announcement store instance for the application.
 * 
 * Provides reactive access to announcement data and management functions
 * throughout the Hinagiku platform.
 */
export const announcement = createAnnouncementStore();
