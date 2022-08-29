import * as http from 'http';
import * as Path from 'path';
import * as ChildProcess from 'child_process';
import Express from 'express';

import { ConsoleLogger } from './monitoring/logger';

import ExpressCircuitBreaker from './circuit-breaker/express';
import TransactionHistoryResolver from './resolvers/transaction-resolver';
import FakeTransactionHistoryService from './services/transaction-history/fake';
import InMemoryGlobalConfig from './global-config/in-memory';

const PORT: Number = 3000;
const app = Express();

const LeakyBucket = ChildProcess.fork(`${Path.resolve(__dirname)}/leaky-bucket/process-definition`);

const globalConfig = new InMemoryGlobalConfig();

const circuitBreaker = new ExpressCircuitBreaker({
  bucket: LeakyBucket,
  logger: new ConsoleLogger(),
  config: { resourceName: 'transaction-history', threshold: 10 },
  globalConfig,
});

const transactionHistoryResolver = new TransactionHistoryResolver({
  logger: new ConsoleLogger(),
  transactionHistoryService: new FakeTransactionHistoryService({ globalConfig }),
});

app.get('/me/transaction-history', circuitBreaker.monitor, transactionHistoryResolver.resolve);

http.createServer(app).listen(PORT, () => console.log(`Server listening at ${PORT} 🚀`));
