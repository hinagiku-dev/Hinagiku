import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';

export const route = {
	session: (code: string) => `/code/namespace/session/${code}`,
	group: (code: string) => `/code/namespace/group/${code}`
};

export const CodeSchema = z.object({
	target: z.string().min(1),
	exp: z.instanceof(Timestamp)
});

export type Code = z.infer<typeof CodeSchema>;
