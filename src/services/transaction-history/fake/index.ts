import TransactionHistoryService from '..';
import { CircuitBreakerStatus } from '../../../circuit-breaker/status';
import ApplicationState from '../../../application-state';

export default class FakeTransactionHistoryService implements TransactionHistoryService {
  counter: number;
  globalConfig: ApplicationState;

  constructor({ globalConfig }: { globalConfig: ApplicationState }) {
    this.counter = 1;
    this.globalConfig = globalConfig;
    this.fetchTransactionHistory = this.fetchTransactionHistory.bind(this);
  }

  async fetchTransactionHistory() {
    return new Promise((resolve, reject) => {
      if (
        this.counter === 4 &&
        this.globalConfig.fetchCircuitBreakerState('transaction-history-circuit-breaker') !==
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
