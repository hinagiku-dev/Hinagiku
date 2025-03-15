import { z } from 'zod';
import { Timestamp } from './utils';

export const route = (uid: string) => `/settings/${uid}`;

export const SettingSchema = z.object({
	updatedAt: Timestamp,
	enableVAD: z.boolean().optional()
});

export type Setting = z.infer<typeof SettingSchema>;
