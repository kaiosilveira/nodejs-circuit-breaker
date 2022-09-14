import { ChildProcess } from 'child_process';
import EventEmitter from 'events';
import { Request, Response } from 'express';
import {
  LeakyBucketMessageTypes,
  LeakyBucketMessage,
} from '../../../app/infra/leaky-bucket/messages';
import ILogger from '../../../app/infra/logger';
import ApplicationCache from '../../../app/reliability/cache';
import CircuitBreaker, { CircuitBreakerEvents } from '../../../app/stability/circuit-breaker';
import CircuitBreakerState from '../../../app/stability/circuit-breaker/state';
import CircuitBreakerClosedState from '../../../app/stability/circuit-breaker/state/closed';
import CircuitBreakerHalfOpenState from '../../../app/stability/circuit-breaker/state/half-open';
import CircuitBreakerOpenState from '../../../app/stability/circuit-breaker/state/open';
import { CircuitBreakerStatus } from '../../../app/stability/circuit-breaker/status';
import * as httpCodes from '../http/status-codes';

export type ExpressCircuitBreakerConfig = { resourceName: string; threshold: number };
export type ExpressCircuitBreakerProps = {
  bucket: ChildProcess;
  logger: ILogger;
  config: ExpressCircuitBreakerConfig;
  cache?: ApplicationCache;
};

export type ExpressCircuitBreakerDescription = {
  circuitBreakerId: string;
  resource: string;
  state: CircuitBreakerStatus;
};

export default class ExpressCircuitBreaker extends EventEmitter implements CircuitBreaker {
  subscriptionId: string;
  logger: ILogger;
  bucket: ChildProcess;
  config: ExpressCircuitBreakerConfig;
  state: CircuitBreakerState;
  cache?: ApplicationCache;

  constructor({ bucket, logger, config, cache }: ExpressCircuitBreakerProps) {
    super();
    this.config = config;
    this.bucket = bucket;
    this.logger = logger;
    this.cache = cache;
    this.subscriptionId = `${this.config.resourceName}-circuit-breaker`;
    this.state = new CircuitBreakerClosedState({ circuitBreaker: this, logger: this.logger });

    this.monitor = this.monitor.bind(this);
    this.close = this.close.bind(this);
    this.open = this.open.bind(this);
    this.halfOpen = this.halfOpen.bind(this);
    this.registerFailure = this.registerFailure.bind(this);
    this.describe = this.describe.bind(this);

    this._setupLeakyBucket = this._setupLeakyBucket.bind(this);
    this._handleBucketMessage = this._handleBucketMessage.bind(this);

    this._setupLeakyBucket();
  }

  getStatus(): CircuitBreakerStatus {
    return this.state.status;
  }

  getIdentifier(): string {
    return this.subscriptionId;
  }

  monitor(req: Request, res: Response, next: Function): void | Response {
    if (this.state.status === CircuitBreakerStatus.OPEN) {
      this.logger.info({ msg: 'Call refused from circuit breaker', status: this.state.status });
      return res
        .status(httpCodes.INTERNAL_SERVER_ERROR)
        .json({ msg: 'Call refused from circuit breaker' });
    }

    res.on('finish', () => {
      switch (res.statusCode) {
        case httpCodes.OK:
          const userId = req.headers['x-user-id']?.toString();
          if (userId) this.cache?.set(userId, JSON.stringify(res.body));
          this.state.handleOkResponse();
          break;
        case httpCodes.INTERNAL_SERVER_ERROR:
          this.state.handleInternalServerErrorResponse();
          break;
        default:
          break;
      }
    });

    next();
  }

  close(): void {
    this.state = new CircuitBreakerClosedState({ circuitBreaker: this, logger: this.logger });
    this.emit(CircuitBreakerEvents.CIRCUIT_BREAKER_STATE_UPDATED, {
      circuitBreakerId: this.subscriptionId,
      newState: CircuitBreakerStatus.CLOSED,
    });
  }

  open(): void {
    this.state = new CircuitBreakerOpenState({ circuitBreaker: this, logger: this.logger });
    this.emit(CircuitBreakerEvents.CIRCUIT_BREAKER_STATE_UPDATED, {
      circuitBreakerId: this.subscriptionId,
      newState: CircuitBreakerStatus.OPEN,
    });
  }

  halfOpen(): void {
    this.state = new CircuitBreakerHalfOpenState({ circuitBreaker: this, logger: this.logger });
    this.emit(CircuitBreakerEvents.CIRCUIT_BREAKER_STATE_UPDATED, {
      circuitBreakerId: this.subscriptionId,
      newState: CircuitBreakerStatus.HALF_OPEN,
    });
  }

  registerFailure(): void {
    this.bucket.send({
      type: LeakyBucketMessageTypes.NEW_FAILURE,
      payload: { subscriptionId: this.subscriptionId },
    } as LeakyBucketMessage);
  }

  describe(): ExpressCircuitBreakerDescription {
    return {
      circuitBreakerId: this.getIdentifier(),
      state: this.getStatus(),
      resource: this.config.resourceName,
    };
  }

  private _handleBucketMessage(msg: LeakyBucketMessage): void {
    switch (msg.type) {
      case LeakyBucketMessageTypes.THRESHOLD_VIOLATION:
        this.logger.info({ msg: 'Threshold violated. Opening circuit.' });
        this.open();
        break;
      case LeakyBucketMessageTypes.THRESHOLD_RESTORED:
        this.halfOpen();
        this.logger.info({
          msg: 'Threshold restored. Moving circuit to half-open.',
          status: this.state.status,
        });
        break;
      default:
        break;
    }
  }

  private _setupLeakyBucket(): void {
    this.bucket.send({
      type: LeakyBucketMessageTypes.REGISTER,
      payload: {
        subscriptionId: this.subscriptionId,
        threshold: this.config.threshold,
      },
    });

    this.bucket.on('message', this._handleBucketMessage);
  }
}
