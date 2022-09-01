import * as http from 'http';
import * as Path from 'path';
import * as ChildProcess from 'child_process';
import Express from 'express';

import { ConsoleLogger } from './monitoring/logger';

import ExpressCircuitBreaker from './circuit-breaker/express';
import TransactionHistoryResolver from './resolvers/transaction-resolver';
import FakeTransactionHistoryService from './services/transaction-history/fake';
import InMemoryApplicationState from './application-state/in-memory';

const PORT: Number = 3000;
const app = Express();

const LeakyBucket = ChildProcess.fork(`${Path.resolve(__dirname)}/leaky-bucket/index`);

const applicationState = new InMemoryApplicationState();

const transactionHistoryCircuitBreaker = new ExpressCircuitBreaker({
  bucket: LeakyBucket,
  logger: new ConsoleLogger(),
  config: { resourceName: 'transaction-history', threshold: 10 },
});

applicationState.registerCircuitBreaker(transactionHistoryCircuitBreaker);

const transactionHistoryResolver = new TransactionHistoryResolver({
  logger: new ConsoleLogger(),
  transactionHistoryService: new FakeTransactionHistoryService({ applicationState }),
});

app.get(
  '/me/transaction-history',
  transactionHistoryCircuitBreaker.monitor,
  transactionHistoryResolver.resolve
);

http.createServer(app).listen(PORT, () => console.log(`Server listening at ${PORT} 🚀`));
