import TransactionHistoryController from '.';
import { Request, Response } from 'express';

import FakeLogger from '../../../../../app/infra/logger/fake';
import FakeApplicationState from '../../../../../app/infra/application-state/fake';
import FakeApplicationCache from '../../../../../app/reliability/cache/fake';
import FakeTransactionHistoryService from '../../../../../app/services/transaction-history/fake';
import FakeExpressRequest from '../../../../../../test/fakes/express/http/request';
import FakeExpressResponse from '../../../../../../test/fakes/express/http/response';

describe('TransactionHistoryController', () => {
  describe('fetchTransactionHistory', () => {
    const userId = 'user-id-1';
    const payload = [{ id: 'transaction-id', amount: 100, date: new Date() }];

    const logger = new FakeLogger();
    const cache = new FakeApplicationCache();
    const fakeSetFn = jest.fn();

    const applicationState = new FakeApplicationState();
    const transactionHistoryService = new FakeTransactionHistoryService({ applicationState });

    const req = new FakeExpressRequest({
      headers: { 'x-user-id': userId },
    }) as unknown as Request;

    const res = new FakeExpressResponse() as unknown as Response;

    beforeEach(() => {
      jest.spyOn(cache, 'set').mockImplementation(fakeSetFn);
      jest
        .spyOn(transactionHistoryService, 'fetchTransactionHistory')
        .mockReturnValue(Promise.resolve(payload));
    });

    afterEach(() => {
      fakeSetFn.mockReset();
    });

    it('should fetch the transaction history for a given user', async () => {
      const ctrl = new TransactionHistoryController({ logger, cache, transactionHistoryService });
      const result = await ctrl.fetchTransactionHistory(req, res);
      expect(result.body).toEqual({ items: payload });
    });

    it('should add the lat successful response to the cache', async () => {
      const ctrl = new TransactionHistoryController({ logger, cache, transactionHistoryService });
      await ctrl.fetchTransactionHistory(req, res);
      expect(fakeSetFn).toHaveBeenCalledWith(
        'transaction-history:user-id-1',
        JSON.stringify({ items: payload })
      );
    });
  });
});
