import { Request, Response } from 'express';
import ILogger from '../../../../../app/infra/logger';
import ApplicationCache from '../../../../../app/reliability/cache';
import TransactionHistoryService from '../../../../../app/services/transaction-history';

export default class TransactionHistoryController {
  logger: ILogger;
  service: TransactionHistoryService;
  cache: ApplicationCache;

  constructor({
    logger,
    cache,
    transactionHistoryService,
  }: {
    logger: ILogger;
    cache: ApplicationCache;
    transactionHistoryService: TransactionHistoryService;
  }) {
    this.cache = cache;
    this.logger = logger;
    this.service = transactionHistoryService;
    this.fetchTransactionHistory = this.fetchTransactionHistory.bind(this);
  }

  async fetchTransactionHistory(req: Request, res: Response): Promise<Response> {
    try {
      const payload = await this.service.fetchTransactionHistory();
      const result = { items: payload };
      this.cache.set(`transaction-history:${req.headers['x-user-id']}`, JSON.stringify(result));
      return res.json(result);
    } catch (ex) {
      this.logger.error({ msg: 'Failed to execute' });
      return res.status(500).json({ msg: 'Bad response from Transaction History Service' });
    }
  }
}
