export function generateCode() {
	return Math.random().toString(36).slice(2, 7);
}

export function getGameCodeFromURL(url: URL) {
	return url.pathname.match(/\/([a-z\d]{5})[\/\?]/)[1];
}
