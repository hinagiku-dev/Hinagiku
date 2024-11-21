import { env } from '$env/dynamic/private';
import { OpenAI } from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

const openai = new OpenAI({
	apiKey: env.OPENAI_API_KEY
});

// 定義 Zod Schema
const KeywordSchema = z.object({
	word: z.string().min(1),
	weight: z.number().min(1).max(100)
});

const WordCloudSchema = z.object({
	keywords: z.array(KeywordSchema)
});

type WordCloudData = Record<string, number>;

export async function generateWordCloud(documents: string[]): Promise<{
	success: boolean;
	data?: WordCloudData;
	error?: string;
}> {
	try {
		// 合併所有文件內容
		const combinedText = documents.join('\n');

		const completion = await openai.beta.chat.completions.parse({
			model: 'gpt-4-turbo-preview',
			messages: [
				{
					role: 'system',
					content: `你是一個文本分析專家。請分析以下文本，提取關鍵字詞並給予權重。
                    規則：
                    1. 只提取有意義的詞彙（避免虛詞、語助詞）
                    2. 權重範圍為 1-100，數字越大代表詞彙越重要
                    3. 最多返回 30 個關鍵詞
                    4. 權重的分配要考慮：
                       - 詞彙在文本中的出現頻率
                       - 詞彙的重要性和相關性
                       - 詞彙的獨特性`
				},
				{
					role: 'user',
					content: combinedText
				}
			],
			response_format: zodResponseFormat(WordCloudSchema, 'word_cloud')
		});

		const result = completion.choices[0].message.parsed;
		if (!result) {
			throw new Error('Failed to parse response');
		}

		// 轉換為 WordCloudData 格式
		const cleanedData: WordCloudData = Object.fromEntries(
			result.keywords.map(({ word, weight }) => [word, weight])
		);

		return {
			success: true,
			data: cleanedData
		};
	} catch (error) {
		console.error('Error in generateWordCloud:', error);
		if (error instanceof z.ZodError) {
			return {
				success: false,
				error: 'Type error: ' + error.errors.map((e) => e.message).join(', ')
			};
		}
		return {
			success: false,
			error: 'Failed to generate word cloud data'
		};
	}
}

// 使用範例：
/*
const documents = [
    "這是一篇關於人工智能的文章...",
    "探討深度學習在教育領域的應用..."
];

const wordCloudResult = await generateWordCloud(documents);
if (wordCloudResult.success) {
    console.log(wordCloudResult.data);
    // 輸出範例：
    // {
    //     "人工智能": 95,
    //     "深度學習": 90,
    //     "教育": 85,
    //     "應用": 75
    // }
}
*/
