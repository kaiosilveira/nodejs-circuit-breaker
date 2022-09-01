import { Request, Response } from 'express';
import ILogger from '../../../../../app/infra/logger';
import TransactionHistoryService from '../../../../../app/services/transaction-history';

export default class TransactionHistoryController {
  logger: ILogger;
  service: TransactionHistoryService;

  constructor({
    logger,
    transactionHistoryService,
  }: {
    logger: ILogger;
    transactionHistoryService: TransactionHistoryService;
  }) {
    this.logger = logger;
    this.service = transactionHistoryService;
    this.fetchTransactionHistory = this.fetchTransactionHistory.bind(this);
  }

  async fetchTransactionHistory(_: Request, res: Response): Promise<Response> {
    try {
      const result = await this.service.fetchTransactionHistory();
      return res.json(result);
    } catch (ex) {
      this.logger.error({ msg: 'Failed to execute' });
      return res.status(500).json({ msg: 'Bad response from Transaction History Service' });
    }
  }
}
