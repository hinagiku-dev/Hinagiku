import { browser } from '$app/environment';
import { writable } from 'svelte/store';

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

		// Generate a random vibrant color
		const hue = Math.floor(Math.random() * 360);
		const color = `hsl(${hue}, 100%, 60%)`;

		// Generate a random ID safely for server-side rendering
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
		set(null);
	}

	return {
		subscribe,
		broadcast,
		cancel,
		dismiss
	};
}

export const announcement = createAnnouncementStore();
