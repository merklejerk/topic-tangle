import express from 'express';
import express5 from 'express5';
import { http } from '@google-cloud/functions-framework';
import { createTangleMiddleware, InMemoryDataStore } from 'mock';

const app = express();
const app5 = express5();

const dataStore = new InMemoryDataStore();
app5.use(createTangleMiddleware(dataStore));

app.use('/tangle', app5);

http('tangle', app);
