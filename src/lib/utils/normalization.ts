/**
 * Normalizes the given text by removing extra spaces, converting to lowercase,
 * and trimming leading/trailing spaces.
 *
 * @param input - The input text to normalize.
 * @returns The normalized text.
 */
export function normalizeText(input: string): string {
	console.log('Original text:', input);

	// 1. 在英文單字和數字的前後加上空白
	input = input
		.replace(/([a-zA-Z0-9])/g, ' $1 ')
		.replace(/\s+/g, ' ')
		.trim();

	// 2. 所有標點符號轉為全型，並保持英文單字和數字為半形
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
