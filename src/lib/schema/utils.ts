import { z } from 'zod';

// since stupid firestore use different class with the same name between server and client
// we cannot use instanceof to do the type checking...
export const Timestamp = z.custom(
	(value) => value instanceof Object && value.constructor.name === 'Timestamp',
	{
		message: 'Invalid Timestamp'
	}
);
