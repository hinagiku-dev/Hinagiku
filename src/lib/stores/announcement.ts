import { browser } from '$app/environment';
import { writable } from 'svelte/store';

// Simple localStorage key for visibility
const SHOW_ANNOUNCEMENT_KEY = 'hinagiku-show-announcement';

export interface Announcement {
	id: string;
	message: string;
	active: boolean;
	color: string;
}

function createAnnouncementStore() {
	const { subscribe, update, set } = writable<Announcement | null>(null);

	function broadcast(message: string) {
		if (!browser) return;

		// When broadcasting, set the show flag to true
		localStorage.setItem(SHOW_ANNOUNCEMENT_KEY, 'true');

		// Generate a random vibrant color
		const hue = Math.floor(Math.random() * 360);
		const color = `hsl(${hue}, 100%, 60%)`;

		// Generate a random ID
		const id = browser ? crypto.randomUUID() : Date.now().toString();

		update(() => ({
			id,
			message,
			active: true,
			color
		}));
	}

	function cancel() {
		set(null);
	}

	function dismiss() {
		// When dismissing, set the show flag to false
		if (browser) {
			localStorage.setItem(SHOW_ANNOUNCEMENT_KEY, 'false');
		}
		set(null);
	}

	// Simple function to check if announcements should be shown
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

export const announcement = createAnnouncementStore();
