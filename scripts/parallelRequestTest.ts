import axios from 'axios';

const sendRequest = async (url: string, data: { message: string }) => {
	try {
		const response = await axios.post(url, data);
		return response.data;
	} catch (error) {
		throw new Error(`Failed to send message: ${error.message}`);
	}
};

const testParallelRequests = async () => {
	const url =
		'https://hinagiku-dev.vercel.app/api/session/Z7kUaHXFTPD3mhlHqUt9/group/wfCDfpl2EvfmjjAaNIAv/conversations/3oX51qChzZvvrdEvSPnf/chat';
	const requests = Array.from({ length: 10 }, (_, i) =>
		sendRequest(url, { message: `Test message ${i}` })
	);

	try {
		const results = await Promise.all(requests);
		console.log('All requests succeeded:', results);
	} catch (error) {
		console.error('Error sending message:', error);
	}
};

testParallelRequests();
