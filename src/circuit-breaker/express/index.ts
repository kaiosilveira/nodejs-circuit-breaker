import { ChildProcess } from 'child_process';
import { Request, Response } from 'express';
import ApplicationState from '../../application-state';
import { LeakyBucketMessage } from '../../leaky-bucket/types';
import ILogger from '../../monitoring/logger';
import CircuitBreakerState from '../state';
import CircuitBreakerClosedState from '../state/closed';
import CircuitBreakerHalfOpenState from '../state/half-open';
import CircuitBreakerOpenState from '../state/open';
import { CircuitBreakerStatus } from '../status';

export type ExpressCircuitBreakerConfig = { resourceName: string; threshold: number };
export type ExpressCircuitBreakerProps = {
  bucket: ChildProcess;
  logger: ILogger;
  config: ExpressCircuitBreakerConfig;
  applicationState: ApplicationState;
};

export default class ExpressCircuitBreaker {
  subscriptionId: string;
  logger: ILogger;
  bucket: ChildProcess;
  config: ExpressCircuitBreakerConfig;
  applicationState: ApplicationState;
  state: CircuitBreakerState;

  constructor({ bucket, logger, config, applicationState }: ExpressCircuitBreakerProps) {
    this.config = config;
    this.bucket = bucket;
    this.logger = logger;
    this.applicationState = applicationState;
    this.subscriptionId = `${this.config.resourceName}-circuit-breaker`;
    this.state = new CircuitBreakerClosedState({ circuitBreaker: this, logger: this.logger });

    this.monitor = this.monitor.bind(this);
    this.close = this.close.bind(this);
    this.open = this.open.bind(this);
    this.halfOpen = this.halfOpen.bind(this);
    this.registerFailure = this.registerFailure.bind(this);

    this._setupLeakyBucket = this._setupLeakyBucket.bind(this);
    this._handleBucketMessage = this._handleBucketMessage.bind(this);

    this._setupLeakyBucket();
  }

  monitor(_: Request, res: Response, next: Function): void | Response {
    if (this.state.status === CircuitBreakerStatus.OPEN) {
      this.logger.info({ msg: 'Call refused from circuit breaker', status: this.state.status });
      return res.status(500).json({ msg: 'Call refused from circuit breaker' });
    }

    res.on('finish', () => {
      switch (res.statusCode) {
        case 200:
          this.state.handleOkResponse();
          break;
        case 500:
          this.state.handleInternalServerErrorResponse();
          break;
        default:
          break;
      }
    });

    next();
  }

  close(): void {
    this.applicationState.setCircuitBreakerState(this.subscriptionId, CircuitBreakerStatus.CLOSED);
    this.state = new CircuitBreakerClosedState({ circuitBreaker: this, logger: this.logger });
  }

  open(): void {
    this.applicationState.setCircuitBreakerState(this.subscriptionId, CircuitBreakerStatus.OPEN);
    this.state = new CircuitBreakerOpenState({ circuitBreaker: this, logger: this.logger });
  }

  halfOpen(): void {
    this.applicationState.setCircuitBreakerState(
      this.subscriptionId,
      CircuitBreakerStatus.HALF_OPEN
    );
    this.state = new CircuitBreakerHalfOpenState({ circuitBreaker: this, logger: this.logger });
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
          status: this.state.status,
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
