import { requestLLM, summarizeConcepts } from '$lib/server/gemini';
import { json } from '@sveltejs/kit';
import { z } from 'zod';

export async function GET() {
	// From groups == 'DO1nAnON7EBqvmhULLKc' in sessions == 'V5J7eTOAihp3hNazbxTl', conversations == 'jlTkN3xaaYWpvYI2D9W'
	const conversation = [
		{
			role: 'assistant',
			content:
				'嗨！我是小菊，一位專門輔導學生使用教育相關文件的 AI 助教。我會盡力協助你理解文件內容，達成學習目標。首先，為了更了解你對幸福的看法，可以請你分享一下你對「幸福」的定義嗎？'
		},
		{
			role: 'user',
			content: '整天睡覺'
		},
		{
			role: 'assistant',
			content:
				'睡覺是很棒的享受，能讓人感到放鬆和舒適。但如果只是一直睡覺，你覺得這樣能算是你對「幸福」的完整定義嗎？幸福對你來說，是不是還包含其他的面向呢？'
		},
		{
			role: 'user',
			content: '整天睡覺'
		},
		{
			role: 'assistant',
			content:
				'你說的「整天睡覺」確實是一種享受，能帶來放鬆和舒適。這很棒！不過，如果我們要更完整地定義「幸福」，只包含睡覺可能不夠全面。幸福對你來說，除了放鬆和舒適之外，還有沒有其他更深層的意義或感受呢？例如，有沒有什麼事情會讓你感到特別滿足或快樂？'
		},
		{
			role: 'user',
			content: '吃到好吃的東西'
		},
		{
			role: 'assistant',
			content:
				'吃到好吃的東西也是一種幸福的感覺！這很棒，看來你很懂得享受生活中的美好事物。那麼，除了睡覺和美食，還有沒有其他事情會讓你覺得幸福呢？ 幸福感是不是也可能來自於成就感、人際關係，或是幫助他人呢？'
		},
		{
			role: 'user',
			content: '吃到好吃的東西'
		},
		{
			role: 'assistant',
			content:
				'吃到好吃的東西也是一種幸福的感覺！這很棒，看來你很懂得享受生活中的美好事物。那麼，除了睡覺和美食，還有沒有其他事情會讓你覺得幸福呢？ 幸福感是不是也可能來自於成就感、人際關係，或是幫助他人呢？'
		},
		{
			role: 'user',
			content: '幸福感是不是也可能來自於成就感、人際關係，或是幫助他人呢？'
		},
		{
			role: 'assistant',
			content:
				'你問到幸福感是否可能來自成就感、人際關係或是幫助他人，這些想法都很好！仔細想想，對你來說，做什麼事情會讓你覺得自己是有價值的、有能力的，或是對別人有貢獻的呢？這些感覺，會不會也讓你感到幸福？'
		},
		{
			role: 'user',
			content: '吃到好吃的東西'
		},
		{
			role: 'assistant',
			content:
				'你問到幸福感是否可能來自成就感、人際關係或是幫助他人，這些想法都很好！仔細想想，對你來說，做什麼事情會讓你覺得自己是有價值的、有能力的，或是對別人有貢獻的呢？這些感覺，會不會也讓你感到幸福？'
		},
		{
			role: 'user',
			content: '吃到好吃的東西'
		},
		{
			role: 'assistant',
			content:
				'吃到好吃的東西很棒！這表示你很重視生活中的享受。現在，我們來想想，除了這些能直接帶來快樂的事物，還有沒有其他更深層的幸福來源？例如，你覺得幫助別人、達成目標，或是和家人朋友相處，會不會也讓你感到幸福呢？'
		},
		{
			role: 'user',
			content: '吃到好吃的東西'
		},
		{
			role: 'assistant',
			content:
				'吃到好吃的東西很棒！這表示你很重視生活中的享受。現在，我們來想想，除了這些能直接帶來快樂的事物，還有沒有其他更深層的幸福來源？例如，你覺得幫助別人、達成目標，或是和家人朋友相處，會不會也讓你感到幸福呢？'
		},
		{
			role: 'user',
			content: '吃到好吃的東西'
		},
		{
			role: 'assistant',
			content:
				'吃到好吃的東西很棒！這表示你很重視生活中的享受。現在，我們來想想，除了這些能直接帶來快樂的事物，還有沒有其他更深層的幸福來源？例如，你覺得幫助別人、達成目標，或是和家人朋友相處，會不會也讓你感到幸福呢？'
		},
		{
			role: 'user',
			content: '我認為和朋友分享事情可以讓我感到幸福'
		},
		{
			role: 'assistant',
			content:
				'和朋友分享事情讓你感到幸福，這真是太棒了！這表示你很重視人際關係和情感交流。這麼說來，對你而言，幸福的其中一個重要來源就是與人建立連結。既然你提到了與朋友分享事情，這是一個很好的起點。你能不能再具體地說說，通常是哪些類型的事情，或是怎麼樣的分享方式，會讓你感到特別幸福呢？'
		}
	];

	// Extract user messages and prepare data structure for summarizeConcepts
	const userMessages = conversation.filter((msg) => msg.role === 'user').map((msg) => msg.content);
	const assistantMessages = conversation
		.filter((msg) => msg.role === 'assistant')
		.map((msg) => msg.content);

	// Create input for summarizeConcepts with required structure
	const summaryInput = userMessages.map((content, index) => ({
		summary: content, // Using user message content as summary
		keyPoints: [assistantMessages[index] || ''] // Using corresponding assistant message as key point if available
	}));

	const { similar_view_points, different_view_points, students_summary } =
		await summarizeConcepts(summaryInput);

	// 測試結果集合
	const testResults = {
		personalFirstPersonCheck: null as null | { pass: boolean; message: string },
		conceptFirstPersonCheck: null as null | { pass: boolean; message: string },
		groupSummaryFirstPersonCheck: null as null | { pass: boolean; message: string },
		foreignLanguageCheck: null as null | { pass: boolean; message: string },
		fullWidthPunctuationCheck: null as null | { pass: boolean; message: string },
		dialogQualityCheck: null as null | {
			score: number;
			pass: boolean;
			reasons: string[];
			suggestions: string[];
			message: string;
		}
	};

	// 1. 個人總結第一人稱檢測
	const personalFirstPersonSchema = z.object({ having: z.boolean() });
	const { result: personalFirstPersonResult } = await requestLLM(
		'請檢查以下內容是否有使用「我」、「我的」等第一人稱單數作為主詞或描述',
		[{ role: 'user', content: students_summary }],
		personalFirstPersonSchema
	);

	testResults['personalFirstPersonCheck'] = {
		pass: personalFirstPersonResult.having,
		message: personalFirstPersonResult.having
			? '有使用「我」、「我的」等第一人稱單數作為主詞或描述'
			: '沒有使用「我」、「我的」等第一人稱單數作為主詞或描述'
	};

	// 2. 小組 Concept 生成第一人稱檢測 (已完成)
	const conceptFirstPersonSchema = z.object({ having: z.boolean() });
	const { result: conceptFirstPersonResult } = await requestLLM(
		'請檢查以下內容是否有使用「我們」、「大家」這類型的第一人稱作為主詞',
		[{ role: 'user', content: students_summary }],
		conceptFirstPersonSchema
	);

	testResults['conceptFirstPersonCheck'] = {
		pass: conceptFirstPersonResult.having,
		message: conceptFirstPersonResult.having
			? '有使用「我們」、「大家」這類型的第一人稱作為主詞'
			: '沒有使用「我們」、「大家」這類型的第一人稱作為主詞'
	};

	// 3. 小組總結第一人稱檢測
	const groupSummaryFirstPersonSchema = z.object({ having: z.boolean() });
	const { result: groupSummaryFirstPersonResult } = await requestLLM(
		'請檢查以下內容是否有使用「我們」、「大家」這類型的第一人稱作為主詞',
		[
			{
				role: 'user',
				content: similar_view_points.join('\n') + '\n' + different_view_points.join('\n')
			}
		],
		groupSummaryFirstPersonSchema
	);

	testResults['groupSummaryFirstPersonCheck'] = {
		pass: groupSummaryFirstPersonResult.having,
		message: groupSummaryFirstPersonResult.having
			? '有使用「我們」、「大家」這類型的第一人稱作為主詞'
			: '沒有使用「我們」、「大家」這類型的第一人稱作為主詞'
	};

	// 4. 對話外文檢測
	const foreignLanguageSchema = z.object({
		having: z.boolean(),
		languages: z.array(z.string()).optional()
	});

	const messageContents = [
		similar_view_points.join('\n'),
		different_view_points.join('\n'),
		students_summary
	].join('\n\n');

	const { result: foreignLanguageResult } = await requestLLM(
		'請檢查以下內容是否包含中文以外的語言，如有，列出包含哪些語言',
		[{ role: 'user', content: messageContents }],
		foreignLanguageSchema
	);

	testResults['foreignLanguageCheck'] = {
		pass: !foreignLanguageResult.having,
		message: foreignLanguageResult.having
			? `包含非中文語言: ${foreignLanguageResult.languages?.join(', ')}`
			: '沒有包含非中文語言'
	};

	// 5. 聊天生成對話標點符號全型檢測
	const fullWidthPunctuationSchema = z.object({
		having: z.boolean(),
		examples: z.array(z.string()).optional()
	});

	const { result: fullWidthPunctuationResult } = await requestLLM(
		'請檢查以下對話內容是否都使用全型標點符號 (如：，。！？「」)，而非半型標點符號 (如:,.!?\'")。如有半型標點，請舉例。',
		[{ role: 'user', content: messageContents }],
		fullWidthPunctuationSchema
	);

	testResults['fullWidthPunctuationCheck'] = {
		pass: fullWidthPunctuationResult.having,
		message: fullWidthPunctuationResult.having
			? '正確使用全型標點符號'
			: `存在半型標點符號，例如: ${(fullWidthPunctuationResult.examples || []).join(', ')}`
	};

	// 6. 對話品質檢測
	const dialogQualitySchema = z.object({
		score: z.number().min(1).max(10),
		reasons: z.array(z.string()),
		suggestions: z.array(z.string())
	});

	const { result: dialogQualityResult } = await requestLLM(
		'請評估以下對話的品質，給予1-10分的評分，分析對話品質的優缺點，並提供改善建議。評估標準包括：討論深度、回應相關性、互動程度、討論是否有結論等。',
		[{ role: 'user', content: messageContents }],
		dialogQualitySchema
	);

	testResults['dialogQualityCheck'] = {
		score: dialogQualityResult.score,
		pass: dialogQualityResult.score >= 6, // 假設6分以上為通過
		reasons: dialogQualityResult.reasons,
		suggestions: dialogQualityResult.suggestions,
		message: `對話品質評分: ${dialogQualityResult.score}/10`
	};
	console.log('similar_view_points', similar_view_points);
	console.log('different_view_points', different_view_points);
	console.log('students_summary', students_summary);
	console.log('testResults', testResults);

	return json({
		similar_view_points,
		different_view_points,
		students_summary,
		testResults
	});
}
