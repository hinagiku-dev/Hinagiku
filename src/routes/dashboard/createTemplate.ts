export const createTemplate = async () => {
	const response = await fetch('/api/template', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ public: false })
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to create template');
	}

	const { id } = await response.json();
	return id;
};
