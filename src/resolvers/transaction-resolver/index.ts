import { Request, Response } from 'express';
import ILogger from '../../Logger';
import TransactionHistoryService from '../../services/transaction-history';

export default class TransactionHistoryResolver {
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
    this.resolve = this.resolve.bind(this);
  }

  async resolve(_: Request, res: Response): Promise<Response> {
    try {
      const result = await this.service.fetchTransactionHistory();
      return res.json(result);
    } catch (ex) {
      this.logger.error({ msg: 'Failed to execute' });
      return res.status(500).json({ msg: 'Bad response from Transaction History Service' });
    }
  }
}
