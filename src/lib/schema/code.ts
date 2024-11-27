import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';

export const CodeSchema = z.object({
	target: z.string().min(1),
	exp: z.instanceof(Timestamp)
});

export type Code = z.infer<typeof CodeSchema>;
