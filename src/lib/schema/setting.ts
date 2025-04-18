import { z } from 'zod';
import { Timestamp } from './utils';

export const route = (uid: string) => `/settings/${uid}`;

export const SettingSchema = z.object({
	updatedAt: Timestamp,
	enableVADIndividual: z.boolean().default(false),
	enableVADGroup: z.boolean().default(true)
});

export type Setting = z.infer<typeof SettingSchema>;
