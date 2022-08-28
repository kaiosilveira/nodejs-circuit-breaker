import * as http from 'http';
import * as Express from 'express';
import * as Path from 'path';
import * as ChildProcess from 'child_process';

import { ConsoleLogger } from './Logger';
import CircuitBreaker from './CircuitBreaker';
import GlobalConfig from './GlobalConfig';
import TransactionHistoryResolver from './resolvers/transaction-resolver';
import FakeTransactionHistoryService from './services/transaction-history/fake';

const PORT: Number = 3000;
const app = Express();

const LeakyBucket = ChildProcess.fork(`${Path.resolve(__dirname)}/LeakyBucket/process-definition`);

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
