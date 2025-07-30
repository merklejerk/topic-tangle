import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import express from 'express';
import { createTangleMiddleware } from './server';
import { InMemoryDataStore } from './data_store';

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
app.use(createTangleMiddleware({ dataStore, pruneDurationSeconds: 60 * 60 }));

app.listen(port, host, () => {
	console.log(`🚀 Topic Tangle Mock Backend running at http://${host}:${port}`);
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
