import TransactionHistoryService from '..';
import ApplicationState from '../../../infra/application-state';
import { CircuitBreakerStatus } from '../../../stability/circuit-breaker/status';

export type FakeTransactionHistoryServiceProps = { applicationState: ApplicationState };
export default class FakeTransactionHistoryService implements TransactionHistoryService {
  counter: number;
  applicationState: ApplicationState;

  constructor({ applicationState }: FakeTransactionHistoryServiceProps) {
    this.counter = 1;
    this.applicationState = applicationState;
    this.fetchTransactionHistory = this.fetchTransactionHistory.bind(this);
  }

  async fetchTransactionHistory() {
    return new Promise((resolve, reject) => {
      if (
        this.counter === 4 &&
        this.applicationState.fetchCircuitBreakerState('transaction-history-circuit-breaker') !==
          CircuitBreakerStatus.OPEN
      ) {
        this.counter = 1;
        reject({ msg: 'Service temporarily unavailable' });
      } else {
        this.counter++;
        resolve([{ id: 1, amount: 100, date: new Date() }]);
      }
    });
  }
}
