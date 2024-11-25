export interface FirestoreSpeech {
	speechId: string;
	fileId: string;
	transcription: string;
}

export interface Speech {
	speechId: string;
	fileId: string;
	transcription: string;
}

export function convertFirestoreSpeech(data: FirestoreSpeech): Speech {
	return {
		speechId: data.speechId,
		fileId: data.fileId,
		transcription: data.transcription
	};
}
