export interface LLMChatMessage {
	role: 'user' | 'assistant' | 'system';
	content: string;
	name?: string;
}

export interface Warning {
	moderation: boolean;
	inappropriate_content: number;
	stealing_llm_info: number;
	off_topic: number;
}
export interface LLMChatResult {
	success: boolean;
	content: string;
	warning: Warning;
	completed: boolean[];
	error?: string;
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
