import axios from 'axios';

export const sendRequest = async () => {
	return axios.post('/api', { data: 'test' });
};

export const testParallelRequests = async () => {
	const requests = Array(10)
		.fill(null)
		.map(() => sendRequest());

	await Promise.all(requests);
};

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Parallel Request Test', () => {
	it('should send parallel requests successfully', async () => {
		mockedAxios.post.mockResolvedValue({ data: 'Success' });

		await expect(testParallelRequests()).resolves.not.toThrow();
		expect(mockedAxios.post).toHaveBeenCalledTimes(10);
	});

	it('should handle request failures', async () => {
		mockedAxios.post.mockRejectedValue(new Error('Internal Server Error'));

		await expect(testParallelRequests()).rejects.toThrow(
			'Failed to send message: Internal Server Error'
		);
	});
});
