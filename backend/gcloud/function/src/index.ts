import dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}
import express from 'express';
import express5 from 'express5';
import { http } from '@google-cloud/functions-framework';
import { createTangleMiddleware } from 'mock';
import { GoogleDataStore } from './google_data_store.js';

const app = express();
const app5 = express5();

const dataStore = new GoogleDataStore();
app5.use(createTangleMiddleware({
  dataStore,
  pruneDurationSeconds: process.env.PRUNE_DURATION_SECONDS
    ? parseInt(process.env.PRUNE_DURATION_SECONDS, 10)
    : 60 * 60
}));

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.use('/tangle', app5);

http('tangle', app);
