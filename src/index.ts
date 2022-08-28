import http from 'http';
import Express, { Request, Response } from 'express';
import Path from 'path';
import * as ChildProcess from 'child_process';
import { LeakyBucketMessage } from './LeakyBucket/types';

const PORT: Number = 3000;
const app = Express();

const LeakyBucket = ChildProcess.fork(`${Path.resolve(__dirname)}/LeakyBucket/process-definition`);

let counter = 1;
let CB_OPEN = false;

class FakeTransactionHistoryService {
  constructor() {
    this.fetchTransactionHistory = this.fetchTransactionHistory.bind(this);
  }

  async fetchTransactionHistory() {
    return new Promise((resolve, reject) => {
      if (counter === 4 && !CB_OPEN) {
        counter = 1;
        reject({ msg: 'Service temporarily unavailable' });
      } else {
        counter++;
        resolve([{ id: 1, amount: 100, date: new Date() }]);
      }
    });
  }
}

enum CircuitBreakerStatus {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

interface ILogger {
  info(obj): void;
}

class ConsoleLogger implements ILogger {
  info(obj) {
    console.log(obj);
  }
}

class CircuitBreaker {
  subscriptionId: string = 'abc';
  logger: ILogger;
  bucket: ChildProcess.ChildProcess;
  status: CircuitBreakerStatus;

  constructor({ bucket, logger }: { bucket: ChildProcess.ChildProcess; logger: ILogger }) {
    this.bucket = bucket;
    this.logger = logger;
    this.status = CircuitBreakerStatus.CLOSED;

    this.monitor = this.monitor.bind(this);
    this.close = this.close.bind(this);

    this.bucket.send({
      type: 'REGISTER',
      payload: { subscriptionId: this.subscriptionId, threshold: 2 },
    });

    LeakyBucket.on('message', (msg: LeakyBucketMessage) => {
      switch (msg.type) {
        case 'THRESHOLD_VIOLATION':
          this.logger.info({ msg: 'Threshold violated. Opening circuit.' });
          this.open();
          break;
        case 'THRESHOLD_RESTORED':
          this.halfOpen();
          this.logger.info({
            msg: 'Threshold restored. Moving circuit to half-open.',
            status: this.status,
          });
          break;
        default:
          break;
      }
    });
  }

  monitor(_: Request, res: Response, next: Function): void | Response {
    if (this.status === CircuitBreakerStatus.OPEN) {
      this.logger.info({ msg: 'Call refused from circuit breaker', status: this.status });
      return res.status(500).json({ msg: 'Call refused from circuit breaker' });
    }

    res.on('finish', () => {
      if (this.status === CircuitBreakerStatus.HALF_OPEN) {
        if (res.statusCode === 200) {
          this.logger.info({
            msg: 'Successful response while in a HALF_OPEN state. Closing circuit.',
            status: this.status,
          });
          this.close();
        } else {
          this.open();
          this.logger.info({
            msg: 'Failure response while in a HALF_OPEN state. Opening circuit.',
            status: this.status,
          });
        }
      }

      if (res.statusCode === 500) {
        this.bucket.send({
          type: 'NEW_FAILURE',
          payload: { subscriptionId: this.subscriptionId },
        } as LeakyBucketMessage);
      }

      if (res.statusCode === 200) {
        this.logger.info({ msg: 'Successful response', status: this.status });
      }
    });

    next();
  }

  close(): void {
    CB_OPEN = false;
    this.status = CircuitBreakerStatus.CLOSED;
  }

  open(): void {
    CB_OPEN = true;
    this.status = CircuitBreakerStatus.OPEN;
  }

  halfOpen(): void {
    CB_OPEN = false;
    this.status = CircuitBreakerStatus.HALF_OPEN;
  }
}

const circuitBreaker = new CircuitBreaker({ bucket: LeakyBucket, logger: new ConsoleLogger() });

app.get('/me/transaction-history', circuitBreaker.monitor, async (_, res) => {
  const svc = new FakeTransactionHistoryService();
  try {
    const result = await svc.fetchTransactionHistory();
    return res.json(result);
  } catch (ex) {
    console.log(ex);
    return res.status(500).json({ msg: 'Bad response from Transaction History Service' });
  }
});

http.createServer(app).listen(PORT, () => console.log(`Server listening at ${PORT} 🚀`));
