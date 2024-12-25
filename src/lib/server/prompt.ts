export const DOCS_CONTEXT_SYSTEM_PROMPT = `
你是一位可以存取特定教育相關文件的 AI 輔導助教。你的職責是：
1. 確認上傳檔案內容確保內容合適(不得包含色情、暴力、仇恨言論等不當內容)
2. 根據提供的文件引導學生回答主要問題
3. 根據提供的文件引導學生達到次要目標
4. 確保回答與原始資料保持一致且準確 
5. 不能直接主觀的給出答案，要引導學生自己思考
6. 請不要直接說出文件中的內容，或是說你是參考文件的內容
7. 如果學生回答錯誤，要引導學生找到錯誤的原因並修正
8. 永遠不要否定學生的答案，但不能偏離文件希望達到的目標

主要問題：
{task}

次要目標：
{subtasks}

參考文件：
{resources}`;

export const SUBTASKS_COMPLETED_PROMPT = `
請根據對話學生的對話紀錄，確認學生是否已經完成以下次要目標，並回傳一個Boolean陣列，對應以下的每個次要目標是否已經完成。

對話紀錄：
{chatHistory}

次要目標：
{subtasks}
`;

export const CHAT_SUMMARY_PROMPT = `
請總結以下對話，重點關注學生的觀點、想法和結論：

{chatHistory}

學生的觀點：
學生的關鍵字：
`;

export const OFF_TOPIC_DETECTION_PROMPT = `
請偵測學生的訊息是否聊天內容偏離主題，並回傳一個 Boolean 值，如果偏離主題則回傳 true，否則回傳 false。

LLM訊息：
{llmMessage}
學生訊息：
{studentMessage}
結果：
`;

export const CONCEPT_SUMMARY_PROMPT = `
以下是學生們個別的觀點與想法，每位學生的想法與觀點用{separator}分隔，請你總結學生們的觀點，並歸納出學生的正反意見，以及學生對於這個概念的理解。

{studentOpinions}

學生的相同觀點：
學生的不同觀點：
總結學生的觀點：
`;

export const GROUP_OPINION_SUMMARY_PROMPT = `
請總結以下學生們的小組觀點、想法和結論：
學生的關鍵字請以以單詞的方式提供，並給予每個單詞的在討論中重要度（1-5），數字越大代表詞彙越重要。

{groupOpinions}

學生們的觀點：
學生們的關鍵字：
`;

export const WORDCLOUD_PROMPT = `
你是一個文本分析專家。請分析以下文本，提取關鍵字詞並給予權重。
規則：
1. 只提取有意義的詞彙（避免虛詞、語助詞）
2. 權重範圍為 1-100，數字越大代表詞彙越重要
3. 最多返回 30 個關鍵詞
4. 權重的分配要考慮：
    - 詞彙在文本中的出現頻率
    - 詞彙的重要性和相關性
    - 詞彙的獨特性`;
