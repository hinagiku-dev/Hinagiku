export function generateTempId(): string {
	// Generate a 6-digit number
	return Math.floor(100000 + Math.random() * 900000).toString();
}

export function validateTempId(id: string): boolean {
	return /^\d{6}$/.test(id);
}
