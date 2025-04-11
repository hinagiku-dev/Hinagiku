/**
 * Normalizes the given text by removing extra spaces, converting punctuation to full-width,
 * and removing bold markers (**) while preserving the content inside them.
 * It also adds spaces around English words and numbers, ensuring that they are not
 * affected by the full-width conversion.
 *
 * @param input - The input text to normalize.
 * @returns The normalized text.
 */
export function normalizeText(input: string): string {
	console.log('Original text:', input);

	// 1.
	input = input
		.replace(/([a-zA-Z0-9])/g, ' $1 ')
		.replace(/\s+/g, ' ')
		.trim();

	// 2.
	input = input.replace(/[!"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~]/g, (match) => {
		if (match === '$' || match === '_') return match; // 保留 $ 和 _

		const fullwidthPunctuation: { [key: string]: string } = {
			'!': '！',
			'"': '＂',
			'#': '＃',
			'%': '％',
			'&': '＆',
			"'": '＇',
			'(': '（',
			')': '）',
			'*': '＊',
			'+': '＋',
			',': '，',
			'-': '－',
			'.': '．',
			'/': '／',
			':': '：',
			';': '；',
			'<': '＜',
			'=': '＝',
			'>': '＞',
			'?': '？',
			'@': '＠',
			'[': '［',
			'\\': '＼',
			']': '］',
			'^': '＾',
			'`': '｀',
			'{': '｛',
			'|': '｜',
			'}': '｝',
			'~': '～'
		};
		return fullwidthPunctuation[match] || match;
	});

	// 3. 移除粗體標示（**）
	input = input.replace(/\*\*(.*?)\*\*/g, '$1');

	console.log('Normalized text:', input);
	return input;
}
