import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

export const CodeSchema = z.object({
    target: z.string().min(1),
    exp: z.instanceof(Timestamp),
});

export type Code = z.infer<typeof CodeSchema>;
