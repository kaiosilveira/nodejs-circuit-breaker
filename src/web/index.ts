import * as http from 'http';
import * as ChildProcess from 'child_process';

import InMemoryApplicationState from '../app/infra/application-state/in-memory';
import ManagedWinstonLogger from '../app/infra/logger/winston';
import ExpressAppFactory from '../interface-adapters/express';

const PORT: number = 3000;
const logger = new ManagedWinstonLogger({ defaultMeta: { object: 'global' } });
const applicationState = new InMemoryApplicationState();
const LeakyBucket = ChildProcess.fork('./src/app/infra/leaky-bucket');

const expressApp = ExpressAppFactory.createApp({ logger, applicationState, bucket: LeakyBucket });

http.createServer(expressApp).listen(PORT, () => console.log(`Server listening at ${PORT} 🚀`));
