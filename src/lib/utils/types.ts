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

export interface Discussion {
	id: string | null;
	content: string;
	speaker: string;
}

export interface StudentSpeak {
	role: string;
	content: string;
}
