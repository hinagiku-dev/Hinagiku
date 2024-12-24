/**
 * Counts the number of words in a given text, handling both CJK (Chinese, Japanese, Korean) characters and English words.
 *
 * CJK characters are counted individually as one word each, while English text is split by whitespace.
 *
 * @param text - The input text containing CJK characters and/or English words
 * @returns The total count of words (sum of CJK characters and English words)
 *
 * @example
 * countWords("Hello world") // returns 2
 * countWords("你好世界") // returns 4
 * countWords("Hello 世界") // returns 3
 */
export function countWords(text: string): number {
	const cjkCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
	const engWords = text
		.replace(/[\u4e00-\u9fff]/g, '')
		.trim()
		.split(/\s+/)
		.filter(Boolean).length;
	return cjkCount + engWords;
}
