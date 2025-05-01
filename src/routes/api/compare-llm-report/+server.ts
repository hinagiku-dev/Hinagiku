import { getConversationsData, getConversationsRef } from '$lib/server/firebase';
import { requestLLM, summarizeConcepts } from '$lib/server/gemini';
import { json } from '@sveltejs/kit';
import { z } from 'zod';

import type { Conversation } from '$lib/schema/conversation';

export async function GET() {
	// 這裡可改為從 query 取得參數，暫時寫死
	const sessionId = 'V5J7eTOAihp3hNazbxTl';
	const groupId = 'DO1nAnON7EBqvmhULLKc';

	const conversations_ref = getConversationsRef(sessionId, groupId);
	const conversation = await getConversationsData(conversations_ref);

	const { similar_view_points, different_view_points, students_summary } = await summarizeConcepts(
		conversation.map((conv: Conversation) => ({
			summary: conv.summary as string,
			keyPoints: conv.keyPoints as string[]
		}))
	);

	// 測試結果集合
	const testResults = {
		personalFirstPersonCheck: null as null | { userId: string; pass: boolean; message: string }[],
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
	const personalFirstPersonPrompt =
		'請檢查以下內容是否有使用「我」、「我的」等第一人稱單數作為主詞或描述';

	// 針對每個人的總結進行檢測
	const personalFirstPersonResults = await Promise.all(
		conversation.map(async (conv: Conversation) => {
			const { result } = await requestLLM(
				personalFirstPersonPrompt,
				[{ role: 'user', content: conv.summary || '' }],
				personalFirstPersonSchema
			);

			return {
				userId: conv.userId,
				pass: result.having,
				message: result.having ? '有使用第一人稱單數' : '沒有使用第一人稱單數'
			};
		})
	);

	testResults['personalFirstPersonCheck'] = personalFirstPersonResults;

	// 2. 小組 Concept 生成第一人稱檢測 (已完成)
	const conceptFirstPersonSchema = z.object({ having: z.boolean() });
	const { result: conceptFirstPersonResult } = await requestLLM(
		'請檢查以下內容是否有使用「我們」、「大家」這類型的第一人稱作為主詞',
		[{ role: 'user', content: students_summary }],
		conceptFirstPersonSchema
	);

	testResults['conceptFirstPersonCheck'] = {
		pass: conceptFirstPersonResult.having,
		message: conceptFirstPersonResult.having ? '有使用「我們」作為主詞' : '沒有使用「我們」作為主詞'
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
			? '有使用「我們」作為主詞'
			: '沒有使用「我們」作為主詞'
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

	return json({
		similar_view_points,
		different_view_points,
		students_summary,
		testResults
	});
}
