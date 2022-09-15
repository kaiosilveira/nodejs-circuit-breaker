import { ChildProcess } from 'child_process';
import { Router } from 'express';
import ApplicationState from '../../../../app/infra/application-state';
import ILogger from '../../../../app/infra/logger';
import ApplicationCache from '../../../../app/reliability/cache';
import FakeTransactionHistoryService from '../../../../app/services/transaction-history/fake';
import ExpressCircuitBreaker from '../../circuit-breaker';
import TransactionHistoryController from './controller';

export type TransactionHistoryResourceProps = {
  router: Router;
  logger: ILogger;
  applicationState: ApplicationState;
  bucket: ChildProcess;
  cache: ApplicationCache;
};

export default class TransactionHistoryResource {
  static build({
    router,
    logger,
    cache,
    applicationState,
    bucket,
  }: TransactionHistoryResourceProps) {
    const transactionHistoryCircuitBreaker = new ExpressCircuitBreaker({
      bucket,
      cache,
      logger: logger.child({ defaultMeta: { object: 'ExpressCircuitBreaker' } }),
      config: { resourceName: 'transaction-history', threshold: 10 },
    });

    applicationState.registerCircuitBreaker(transactionHistoryCircuitBreaker);

    const transactionHistoryResolver = new TransactionHistoryController({
      cache,
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
