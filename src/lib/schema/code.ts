import { z } from 'zod';
import { Timestamp } from './utils';

export const route = {
	session: (code: string) => `/code/namespace/session/${code}`,
	group: (code: string) => `/code/namespace/group/${code}`
};

export const CodeSchema = z.object({
	target: z.string().min(1),
	exp: Timestamp
});

export type Code = z.infer<typeof CodeSchema>;
