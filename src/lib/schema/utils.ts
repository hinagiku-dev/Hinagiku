import { z } from 'zod';

// since stupid firestore use different class with the same name between server and client
// we cannot use instanceof to do the type checking...
export const Timestamp = z.custom(
	(value) =>
		value instanceof Object &&
		typeof value.seconds === 'number' &&
		typeof value.nanoseconds === 'number',
	{
		message: 'Invalid Timestamp'
	}
);
