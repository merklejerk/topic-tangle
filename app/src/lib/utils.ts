export function generateShortId(): string {
	return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function formatDateTime(date: Date): string {
	return new Intl.DateTimeFormat('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	}).format(date);
}
