import { ChildProcess } from 'child_process';
import { Router } from 'express';
import ApplicationState from '../../../app/infra/application-state';
import ILogger from '../../../app/infra/logger';
import FakeTransactionHistoryService from '../../../app/services/transaction-history/fake';
import ExpressCircuitBreaker from '../../../interface-adapters/express/circuit-breaker';
import TransactionHistoryController from '../../../interface-adapters/express/controllers/transaction-history';

export type TransactionHistoryResourceProps = {
  router: Router;
  logger: ILogger;
  applicationState: ApplicationState;
  bucket: ChildProcess;
};

export default class TransactionHistoryResource {
  static build({ router, logger, applicationState, bucket }: TransactionHistoryResourceProps) {
    const transactionHistoryCircuitBreaker = new ExpressCircuitBreaker({
      bucket,
      logger: logger.child({ defaultMeta: { object: 'ExpressCircuitBreaker' } }),
      config: { resourceName: 'transaction-history', threshold: 10 },
    });

    applicationState.registerCircuitBreaker(transactionHistoryCircuitBreaker);

    const transactionHistoryResolver = new TransactionHistoryController({
      logger: logger.child({ defaultMeta: { object: 'ExpressCircuitBreaker' } }),
      transactionHistoryService: new FakeTransactionHistoryService({ applicationState }),
    });

    router.get(
      '/mine',
      transactionHistoryCircuitBreaker.monitor,
      transactionHistoryResolver.fetchTransactionHistory
    );

    return { router };
  }
}
