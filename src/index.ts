import * as http from 'http';
import * as Path from 'path';
import * as ChildProcess from 'child_process';
import Express from 'express';

import { ConsoleLogger } from './logger';
import CircuitBreaker from './circuit-breaker';
import GlobalConfig from './global-config';
import TransactionHistoryResolver from './resolvers/transaction-resolver';
import FakeTransactionHistoryService from './services/transaction-history/fake';

const PORT: Number = 3000;
const app = Express();

const LeakyBucket = ChildProcess.fork(`${Path.resolve(__dirname)}/leaky-bucket/process-definition`);

const globalConfig = new GlobalConfig();

const circuitBreaker = new CircuitBreaker({
  bucket: LeakyBucket,
  logger: new ConsoleLogger(),
  globalConfig,
});

const transactionHistoryResolver = new TransactionHistoryResolver({
  logger: new ConsoleLogger(),
  transactionHistoryService: new FakeTransactionHistoryService({ globalConfig }),
});

app.get('/me/transaction-history', circuitBreaker.monitor, transactionHistoryResolver.resolve);

http.createServer(app).listen(PORT, () => console.log(`Server listening at ${PORT} 🚀`));
