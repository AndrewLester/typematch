export const buildCallRequest = (
	id: string,
	prop: string,
	content: any,
	otherHeaders: Record<string, string>,
) =>
	new Request(`https://itty-durable/call/${prop}`, {
		method: 'GET',
		headers: {
			...otherHeaders,
			'Content-Type': 'application/json',
			'itty-durable-idFromName': id,
			Content: JSON.stringify(content),
		},
	});
