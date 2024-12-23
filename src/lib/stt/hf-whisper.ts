import { env } from '$env/dynamic/private';

export async function transcribe(
	data: Buffer,
	token = env.HUGGINGFACE_TOKEN,
	model = 'JacobLinCool/whisper-large-v3-turbo-common_voice_19_0-zh-TW'
): Promise<string> {
	const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
			'x-wait-for-model': 'true',
			'x-use-cache': 'false'
		},
		method: 'POST',
		body: data
	});

	if (!response.ok) {
		throw new Error(`Failed to transcribe audio: ${response.statusText}`);
	}
	const result: { text: string } = await response.json();
	return result.text.trim();
}
