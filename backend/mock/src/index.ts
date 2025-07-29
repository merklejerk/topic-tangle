import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import express from 'express';
import { createTangleMiddleware } from './server';
import { InMemoryDataStore } from './dataStore';

const argv = yargs(hideBin(process.argv))
	.option('port', {
		alias: 'p',
		type: 'number',
		default: 3001,
		description: 'Port to run the server on'
	})
	.option('host', {
		alias: 'h',
		type: 'string',
		default: 'localhost',
		description: 'Host to bind the server to'
	})
	.help()
	.parseSync();

const { port, host } = argv;

const app = express();
const dataStore = new InMemoryDataStore();
app.use(createTangleMiddleware(dataStore));

app.listen(port, host, () => {
	console.log(`🚀 Topic Tangle Mock Backend running at http://${host}:${port}`);
	console.log(`📊 Health check: http://${host}:${port}/health`);
	console.log('');
	console.log('Available endpoints:');
	console.log('  POST /api/rooms - Create a room');
	console.log('  GET  /api/rooms/:id - Get room details');
	console.log('  POST /api/rooms/:id/selections - Submit user selection');
	console.log('  DELETE /api/rooms/:id/selections - Delete user selection');
	console.log('  POST /api/rooms/:id/breakout - Create breakout groups');
	console.log('  GET  /api/rooms/:id/data - Get room data');
	console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
	console.log('\n👋 Shutting down mock backend...');
	process.exit(0);
});

process.on('SIGTERM', () => {
	console.log('\n👋 Shutting down mock backend...');
	process.exit(0);
});
