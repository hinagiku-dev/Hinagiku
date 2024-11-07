// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { DecodedIdToken } from 'firebase-admin/auth';

declare global {
	namespace App {
		interface Locals {
			user: DecodedIdToken | null;
		}
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
