import { ChildProcess } from 'child_process';
import { randomUUID } from 'crypto';
import Express from 'express';
import ApplicationState from '../../app/infra/application-state';
import ILogger from '../../app/infra/logger';
import InMemoryCache from '../../external/cache/in-memory';
import IncomingRequestMiddleware from './middlewares/incoming-request';
import OutgoingResponseMiddleware from './middlewares/outgoing-response';
import AdminResource from './resources/admin';

import TransactionHistoryResource from './resources/transaction-history';

export type ExpressAppFactoryProps = {
  bucket: ChildProcess;
  logger: ILogger;
  applicationState: ApplicationState;
};

export default class ExpressAppFactory {
  static createApp({ bucket, logger, applicationState }) {
    const app = Express();

    app.use(Express.json());
    app.use(Express.urlencoded({ extended: true }));
    app.use(new IncomingRequestMiddleware({ logger, generateUUID: randomUUID }).hook);
    app.use(new OutgoingResponseMiddleware({ logger }).hook);

    const adminResource = AdminResource.build({ applicationState, router: Express.Router() });
    const transactionHistoryResource = TransactionHistoryResource.build({
      router: Express.Router(),
      cache: new InMemoryCache(),
      bucket,
      logger,
      applicationState,
    });

    app.use('/transaction-history', transactionHistoryResource.router);
    app.use('/admin', adminResource.router);

    return app;
  }
}
