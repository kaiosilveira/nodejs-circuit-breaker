import { ChildProcess } from 'child_process';
import { Request, Response } from 'express';

import ILogger from '../Logger';
import { LeakyBucketMessage } from '../LeakyBucket/types';
import GlobalConfig from '../GlobalConfig';

export enum CircuitBreakerStatus {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

export default class CircuitBreaker {
  subscriptionId: string = 'abc';
  logger: ILogger;
  bucket: ChildProcess;
  status: CircuitBreakerStatus;
  globalConfig: GlobalConfig;

  constructor({
    bucket,
    logger,
    globalConfig,
  }: {
    bucket: ChildProcess;
    logger: ILogger;
    globalConfig: GlobalConfig;
  }) {
    this.bucket = bucket;
    this.logger = logger;
    this.globalConfig = globalConfig;
    this.status = CircuitBreakerStatus.CLOSED;

    this.monitor = this.monitor.bind(this);
    this.close = this.close.bind(this);

    this.bucket.send({
      type: 'REGISTER',
      payload: { subscriptionId: this.subscriptionId, threshold: 2 },
    });

    this.bucket.on('message', (msg: LeakyBucketMessage) => {
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
    this.globalConfig.setCircuitBreakerOpen(false);
    this.status = CircuitBreakerStatus.CLOSED;
  }

  open(): void {
    this.globalConfig.setCircuitBreakerOpen(true);
    this.status = CircuitBreakerStatus.OPEN;
  }

  halfOpen(): void {
    this.globalConfig.setCircuitBreakerOpen(false);
    this.status = CircuitBreakerStatus.HALF_OPEN;
  }
}
