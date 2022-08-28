import TransactionHistoryService from '..';
import GlobalConfig from '../../../global-config';

export default class FakeTransactionHistoryService implements TransactionHistoryService {
  counter: number;
  globalConfig: GlobalConfig;

  constructor({ globalConfig }: { globalConfig: GlobalConfig }) {
    this.counter = 1;
    this.globalConfig = globalConfig;
    this.fetchTransactionHistory = this.fetchTransactionHistory.bind(this);
  }

  async fetchTransactionHistory() {
    return new Promise((resolve, reject) => {
      if (this.counter === 4 && !this.globalConfig.CB_OPEN) {
        this.counter = 1;
        reject({ msg: 'Service temporarily unavailable' });
      } else {
        this.counter++;
        resolve([{ id: 1, amount: 100, date: new Date() }]);
      }
    });
  }
}
