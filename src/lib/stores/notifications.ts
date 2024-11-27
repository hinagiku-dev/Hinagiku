import { writable } from 'svelte/store';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
	id: string;
	type: NotificationType;
	message: string;
	timeout?: number;
}

function createNotificationStore() {
	const { subscribe, update } = writable<Notification[]>([]);

	function send(message: string, type: NotificationType = 'info', timeout = 3000) {
		const id = crypto.randomUUID();

		update((notifications) => [...notifications, { id, type, message }]);

		if (timeout) {
			setTimeout(() => {
				dismiss(id);
			}, timeout);
		}
	}

	function dismiss(id: string) {
		update((notifications) => notifications.filter((notification) => notification.id !== id));
	}

	return {
		subscribe,
		send,
		dismiss,
		success: (msg: string, timeout?: number) => send(msg, 'success', timeout),
		error: (msg: string, timeout?: number) => send(msg, 'error', timeout),
		warning: (msg: string, timeout?: number) => send(msg, 'warning', timeout),
		info: (msg: string, timeout?: number) => send(msg, 'info', timeout)
	};
}

export const notifications = createNotificationStore();
