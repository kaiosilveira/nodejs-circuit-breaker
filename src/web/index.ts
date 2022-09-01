import * as http from 'http';
import * as ChildProcess from 'child_process';

import InMemoryApplicationState from '../app/infra/application-state/in-memory';
import ExpressAppFactory from '../interface-adapters/express';
import { ConsoleLogger } from '../app/infra/logger';

const PORT: number = 3000;
const logger = new ConsoleLogger();
const applicationState = new InMemoryApplicationState();
const LeakyBucket = ChildProcess.fork('./src/app/infra/leaky-bucket');

const expressApp = ExpressAppFactory.createApp({ logger, applicationState, bucket: LeakyBucket });

http.createServer(expressApp).listen(PORT, () => console.log(`Server listening at ${PORT} 🚀`));
