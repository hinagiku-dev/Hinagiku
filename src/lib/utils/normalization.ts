/**
 * Normalizes the given text by removing extra spaces, converting to lowercase,
 * and trimming leading/trailing spaces.
 *
 * @param text - The input text to normalize.
 * @returns The normalized text.
 */
export function text_normalization(text: string) {
	return text.replace(/[\u3000\uFF01-\uFF5E]/g, (char) => {
		const code = char.charCodeAt(0);
		// full-width space
		if (code === 0x3000) {
			return String.fromCharCode(0x0020);
		}
		// full-width punctuation
		return String.fromCharCode(code - 0xfee0);
	});
}
