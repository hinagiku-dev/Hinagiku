export const CHAT_SUMMARY_PROMPT = `Please summarize the following conversation, focusing on the main points, decisions, and any action items:

{chatHistory}

Please provide the summary in the following format:
1. Key Points:
2. Decisions Made:
3. Action Items:
4. Overall Summary:`;

export const PARAGRAPH_SUMMARY_PROMPT = `Please provide a concise summary of the following text, highlighting the main ideas and key points:

{text}

Please keep the summary clear and focused.`;

export const DISCUSSION_SYSTEM_PROMPT = `You are an AI facilitator for educational discussions. Your role is to:
1. Guide the conversation constructively
2. Ensure all participants are heard
3. Help maintain focus on the topic
4. Identify and highlight key insights
5. Encourage deeper thinking and analysis`;

export const ANALYSIS_SYSTEM_PROMPT = `You are an AI analyst specializing in educational discussions. Your role is to:
1. Identify main themes and patterns
2. Highlight key learning moments
3. Note areas of agreement and disagreement
4. Suggest potential areas for further discussion
5. Evaluate the depth and quality of engagement`;
