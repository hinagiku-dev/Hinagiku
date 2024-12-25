export interface LLMChatMessage {
	role: 'user' | 'assistant' | 'system';
	content: string;
	name?: string;
}

export interface DBChatMessage {
	role: 'user' | 'assistant' | 'system';
	content: string;
	audio: string | null;
	warning: {
		moderation: boolean;
		offTopic: boolean;
	} | null;
}

export interface Discussion {
	id: string | null;
	content: string;
	speaker: string;
	warning: {
		moderation: boolean;
		offTopic: boolean;
	};
}

export interface SummaryData {
	summary: string;
	keyPoints: string[];
}
