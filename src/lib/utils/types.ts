export interface LLMChatMessage {
	role: 'user' | 'assistant' | 'system';
	content: string;
	name?: string;
}

export interface DBChatMessage {
	role: 'user' | 'assistant' | 'system';
	content: string;
	audio: string | null;
}
