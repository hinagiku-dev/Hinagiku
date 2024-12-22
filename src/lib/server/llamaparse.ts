interface UploadResponse {
	id: string;
	status: 'PENDING' | 'SUCCESS' | 'FAILED';
}

interface JobStatus {
	status: 'PENDING' | 'SUCCESS' | 'FAILED';
	error?: string;
}

interface MarkdownResult {
	markdown: string;
	job_metadata: {
		credits_used: number;
		job_credits_usage: number;
		job_pages: number;
		job_auto_mode_triggered_pages: number;
		job_is_cache_hit: boolean;
		credits_max: number;
	};
}

export class LlamaParse {
	private baseUrl = 'https://api.cloud.llamaindex.ai/api/parsing';
	private headers: HeadersInit;

	constructor(apiKey: string) {
		if (!apiKey) throw new Error('API key is required');
		this.headers = {
			Authorization: `Bearer ${apiKey}`,
			accept: 'application/json'
		};
	}

	public async parseFile(file: File | Blob): Promise<MarkdownResult> {
		const jobId = await this.uploadFile(file);

		let status;
		do {
			status = await this.checkStatus(jobId);
			await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second between checks
		} while (status.status === 'PENDING');

		if (status.status !== 'SUCCESS') {
			throw new Error(`Parsing failed: ${status.error}`);
		}

		return this.getMarkdownResult(jobId);
	}

	public async uploadFile(file: File | Blob): Promise<string> {
		const formData = new FormData();
		formData.append('file', file);

		const response = await fetch(`${this.baseUrl}/upload`, {
			method: 'POST',
			headers: this.headers,
			body: formData
		});

		if (!response.ok) {
			throw new Error(`Upload failed: ${response.statusText}`);
		}

		const data = (await response.json()) as UploadResponse;
		return data.id;
	}

	public async checkStatus(jobId: string): Promise<JobStatus> {
		const response = await fetch(`${this.baseUrl}/job/${jobId}`, {
			headers: this.headers
		});

		if (!response.ok) {
			throw new Error(`Status check failed: ${response.statusText}`);
		}

		return response.json() as Promise<JobStatus>;
	}

	public async getMarkdownResult(jobId: string): Promise<MarkdownResult> {
		const response = await fetch(`${this.baseUrl}/job/${jobId}/result/markdown`, {
			headers: this.headers
		});

		if (!response.ok) {
			throw new Error(`Failed to get results: ${response.statusText}`);
		}

		const data = (await response.json()) as MarkdownResult;
		return data;
	}
}
