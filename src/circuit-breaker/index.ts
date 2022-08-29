import { ChildProcess } from 'child_process';
import { Request, Response } from 'express';

import ILogger from '../logger';
import { LeakyBucketMessage } from '../leaky-bucket/types';
import GlobalConfig from '../global-config';

export enum CircuitBreakerStatus {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

interface CircuitBreakerState {
  handleOkResponse(): void;
  handleInternalServerErrorResponse(): void;
}

class CircuitBreakerClosedState implements CircuitBreakerState {
  logger: ILogger;
  circuitBreaker: CircuitBreaker;

  constructor({ circuitBreaker, logger }: { circuitBreaker: CircuitBreaker; logger: ILogger }) {
    this.logger = logger;
    this.circuitBreaker = circuitBreaker;
  }

  handleOkResponse(): void {
    this.logger.info({ msg: 'Successful response', status: this.circuitBreaker._state });
  }

  handleInternalServerErrorResponse(): void {
    this.circuitBreaker.registerFailure();
  }
}

class CircuitBreakerHalfOpenState implements CircuitBreakerState {
  circuitBreaker: CircuitBreaker;
  logger: ILogger;

  constructor({ circuitBreaker, logger }: { circuitBreaker: CircuitBreaker; logger: ILogger }) {
    this.circuitBreaker = circuitBreaker;
    this.logger = logger;
  }

  handleOkResponse(): void {
    this.circuitBreaker.close();
    this.logger.info({
      msg: 'Successful response while in a HALF_OPEN state. Circuit is now closed.',
      status: this.circuitBreaker._state,
    });
  }

  handleInternalServerErrorResponse(): void {
    this.circuitBreaker.open();
    this.logger.info({
      msg: 'Failure response while in a HALF_OPEN state. Opening circuit.',
      status: this.circuitBreaker._state,
    });

    this.circuitBreaker.registerFailure();
  }
}

class CircuitBreakerOpenState implements CircuitBreakerState {
  circuitBreaker: CircuitBreaker;
  constructor({ circuitBreaker }: { circuitBreaker: CircuitBreaker }) {
    this.circuitBreaker = circuitBreaker;
  }

  handleOkResponse(): void {}

  handleInternalServerErrorResponse(): void {
    this.circuitBreaker.registerFailure();
  }
}

export type CircuitBreakerConfig = { resourceName: string; threshold: number };
export default class CircuitBreaker {
  subscriptionId: string;
  logger: ILogger;
  bucket: ChildProcess;
  _state: CircuitBreakerStatus;
  config: CircuitBreakerConfig;
  globalConfig: GlobalConfig;
  state: CircuitBreakerState;

  constructor({
    bucket,
    logger,
    config,
    globalConfig,
  }: {
    bucket: ChildProcess;
    logger: ILogger;
    config: CircuitBreakerConfig;
    globalConfig: GlobalConfig;
  }) {
    this.config = config;
    this.bucket = bucket;
    this.logger = logger;
    this.globalConfig = globalConfig;
    this.subscriptionId = `${this.config.resourceName}-circuit-breaker`;
    this._state = CircuitBreakerStatus.CLOSED;
    this.state = new CircuitBreakerClosedState({ circuitBreaker: this, logger: this.logger });

    this.monitor = this.monitor.bind(this);
    this.close = this.close.bind(this);
    this.registerFailure = this.registerFailure.bind(this);

    this._handleInternalServerErrorResponse = this._handleInternalServerErrorResponse.bind(this);
    this._setupLeakyBucket = this._setupLeakyBucket.bind(this);
    this._handleBucketMessage = this._handleBucketMessage.bind(this);

    this._setupLeakyBucket();
  }

  monitor(_: Request, res: Response, next: Function): void | Response {
    if (this._state === CircuitBreakerStatus.OPEN) {
      this.logger.info({ msg: 'Call refused from circuit breaker', status: this._state });
      return res.status(500).json({ msg: 'Call refused from circuit breaker' });
    }

    res.on('finish', () => {
      switch (res.statusCode) {
        case 200:
          this.state.handleOkResponse();
          break;
        case 500:
          this._handleInternalServerErrorResponse();
          break;
        default:
          break;
      }
    });

    next();
  }

  close(): void {
    this.globalConfig.setCircuitBreakerOpen(false);
    this.state = new CircuitBreakerClosedState({ circuitBreaker: this, logger: this.logger });
    this._state = CircuitBreakerStatus.CLOSED;
  }

  open(): void {
    this.globalConfig.setCircuitBreakerOpen(true);
    this.state = new CircuitBreakerOpenState({ circuitBreaker: this });
    this._state = CircuitBreakerStatus.OPEN;
  }

  halfOpen(): void {
    this.globalConfig.setCircuitBreakerOpen(false);
    this.state = new CircuitBreakerHalfOpenState({ circuitBreaker: this, logger: this.logger });
    this._state = CircuitBreakerStatus.HALF_OPEN;
  }

  setState(status: CircuitBreakerStatus): void {
    this._state = status;
  }

  private _handleInternalServerErrorResponse() {
    switch (this._state) {
      case CircuitBreakerStatus.HALF_OPEN:
        this.open();
        this.logger.info({
          msg: 'Failure response while in a HALF_OPEN state. Opening circuit.',
          status: this._state,
        });
        break;
      default:
        break;
    }

    this.registerFailure();
  }

  registerFailure() {
    this.bucket.send({
      type: 'NEW_FAILURE',
      payload: { subscriptionId: this.subscriptionId },
    } as LeakyBucketMessage);
  }

  private _handleBucketMessage(msg: LeakyBucketMessage) {
    switch (msg.type) {
      case 'THRESHOLD_VIOLATION':
        this.logger.info({ msg: 'Threshold violated. Opening circuit.' });
        this.open();
        break;
      case 'THRESHOLD_RESTORED':
        this.halfOpen();
        this.logger.info({
          msg: 'Threshold restored. Moving circuit to half-open.',
          status: this._state,
        });
        break;
      default:
        break;
    }
  }

  private _setupLeakyBucket() {
    this.bucket.send({
      type: 'REGISTER',
      payload: {
        subscriptionId: this.subscriptionId,
        threshold: this.config.threshold,
      },
    });

    this.bucket.on('message', this._handleBucketMessage);
  }
}
