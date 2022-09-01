import * as http from 'http';
import * as ChildProcess from 'child_process';
import Express from 'express';

import InMemoryApplicationState from '../app/infra/application-state/in-memory';
import ManagedWinstonLogger from '../app/infra/logger/winston';
import TransactionHistoryResource from './resources/transaction-history';

const PORT: number = 3000;
const app = Express();

const logger = new ManagedWinstonLogger({ defaultMeta: { object: 'global' } });
const applicationState = new InMemoryApplicationState();

const LeakyBucket = ChildProcess.fork('./src/app/infra/leaky-bucket');

const transactionHistoryResource = TransactionHistoryResource.build({
  router: Express.Router(),
  bucket: LeakyBucket,
  logger,
  applicationState,
});

app.use('/transaction-history', transactionHistoryResource.router);

http.createServer(app).listen(PORT, () => console.log(`Server listening at ${PORT} 🚀`));
