// Environment configuration
export const ENV = {
	API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
	POLL_INTERVAL: parseInt(import.meta.env.VITE_POLL_INTERVAL || '2000'),
	DEV: import.meta.env.DEV
};

// Development mode helpers
export const isDev = ENV.DEV;
export const isProduction = !ENV.DEV;
