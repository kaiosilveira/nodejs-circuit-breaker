import { ChildProcess } from 'child_process';
import Express from 'express';
import ApplicationState from '../../app/infra/application-state';
import ILogger from '../../app/infra/logger';
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

    const adminResource = AdminResource.build({ applicationState, router: Express.Router() });
    const transactionHistoryResource = TransactionHistoryResource.build({
      router: Express.Router(),
      bucket: bucket,
      logger,
      applicationState,
    });

    app.use('/transaction-history', transactionHistoryResource.router);
    app.use('/admin', adminResource.router);

    return app;
  }
}
