import { ChildProcess } from 'child_process';
import EventEmitter from 'events';
import { Request, Response } from 'express';

import ExpressCircuitBreaker from '.';
import GlobalConfig from '../../application-state';
import FakeLogger from '../../monitoring/logger/fake';
import { CircuitBreakerStatus } from '../status';

type LooseObject = {
  [key: string]: Function;
};

class FakeChildProcess extends ChildProcess {
  _callbacks: LooseObject;

  constructor() {
    super();
    this._callbacks = {};
  }

  send(message) {
    Object.values(this._callbacks).map(cb => cb(message));
    return true;
  }

  on(event: string, callback: Function) {
    this._callbacks[event] = callback;
    return this;
  }
}

class FakeGlobalConfig implements GlobalConfig {
  circuitBreakerStates: Object;

  constructor() {
    this.circuitBreakerStates = {};
  }

  fetchCircuitBreakerState(circuitBreakerId: string): CircuitBreakerStatus {
    return this.circuitBreakerStates[circuitBreakerId];
  }

  setCircuitBreakerState(circuitBreakerId: string, state: CircuitBreakerStatus): void {
    this.circuitBreakerStates[circuitBreakerId] = state;
  }

  isCircuitBreakerOpen(): boolean {
    return false;
  }

  setCircuitBreakerOpen(_: boolean): void {}
}

class FakeExpressResponse extends EventEmitter {
  statusCode: number;
  body: object;
  callbacks: Object;

  constructor({ statusCode }: { statusCode: number } = { statusCode: 200 }) {
    super();
    this.statusCode = statusCode;
    this.body = {};
    this.callbacks = {};
  }

  status(status: number) {
    this.statusCode = status;
    return this;
  }

  json(obj: any): any {
    return { body: obj, status: this.statusCode };
  }
}

describe('CircuitBreaker', () => {
  const threshold = 10;
  const subscriptionId = 'transaction-history-circuit-breaker';
  const bucket = new FakeChildProcess();
  const logger = new FakeLogger();
  const applicationState = new FakeGlobalConfig();
  const next = jest.fn();

  afterEach(() => {
    jest.restoreAllMocks();
    next.mockReset();
  });

  describe('initialization', () => {
    it('should register itself with the LeakyBucket', () => {
      const spyOnSend = jest.spyOn(bucket, 'send');

      new ExpressCircuitBreaker({
        bucket,
        logger,
        applicationState: applicationState,
        config: { resourceName: 'transaction-history', threshold },
      });

      expect(spyOnSend).toHaveBeenCalledTimes(1);
      expect(spyOnSend).toHaveBeenCalledWith({
        type: 'REGISTER',
        payload: { subscriptionId, threshold },
      });
    });

    it('should register message listeners on the LeakyBucket', () => {
      const spyOnOn = jest.spyOn(bucket, 'on');

      new ExpressCircuitBreaker({
        bucket,
        logger,
        applicationState: applicationState,
        config: { resourceName: 'transaction-history', threshold },
      });

      expect(spyOnOn).toHaveBeenCalledTimes(1);
      expect(spyOnOn).toHaveBeenCalledWith('message', expect.anything());
    });
  });

  describe('monitor', () => {
    const threshold = 10;
    const bucket = new FakeChildProcess();
    const logger = new FakeLogger();
    const globalConfig = new FakeGlobalConfig();

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return INTERNAL_SERVER_ERROR 500 if state is OPEN', () => {
      const spyOnLoggerInfo = jest.spyOn(logger, 'info');
      const spyOnSetCircuitBreakerState = jest.spyOn(globalConfig, 'setCircuitBreakerState');

      const cb = new ExpressCircuitBreaker({
        bucket,
        logger,
        applicationState: globalConfig,
        config: { resourceName: 'transaction-history', threshold },
      });

      cb.open();

      const req = {} as Request;
      const res = new FakeExpressResponse() as unknown as Response;
      const next = () => {};

      const result = cb.monitor(req, res, next) as Response;

      expect(result.status).toEqual(500);
      expect(spyOnSetCircuitBreakerState).toHaveBeenCalledWith(
        'transaction-history-circuit-breaker',
        CircuitBreakerStatus.OPEN
      );

      expect(spyOnLoggerInfo).toHaveBeenCalledTimes(1);
      expect(spyOnLoggerInfo).toHaveBeenCalledWith({
        msg: 'Call refused from circuit breaker',
        status: CircuitBreakerStatus.OPEN,
      });
    });

    it('should register success 200 OK response when the state is CLOSED', () => {
      const spyOnLoggerInfo = jest.spyOn(logger, 'info');
      const spyOnSetCircuitBreakerState = jest.spyOn(globalConfig, 'setCircuitBreakerState');

      const cb = new ExpressCircuitBreaker({
        bucket,
        logger,
        applicationState: globalConfig,
        config: { resourceName: 'transaction-history', threshold },
      });

      cb.close();

      const req = {} as Request;
      const res = new FakeExpressResponse() as unknown as Response;

      cb.monitor(req, res, next) as Response;
      res.emit('finish');

      expect(next).toHaveBeenCalledTimes(1);
      expect(spyOnSetCircuitBreakerState).toHaveBeenCalledWith(
        'transaction-history-circuit-breaker',
        CircuitBreakerStatus.CLOSED
      );

      expect(spyOnLoggerInfo).toHaveBeenCalledTimes(1);
      expect(spyOnLoggerInfo).toHaveBeenCalledWith({
        msg: 'Successful response',
        status: CircuitBreakerStatus.CLOSED,
      });
    });

    it('should close the circuit again if response has status 200 OK and circuit is at HALF_OPEN', () => {
      const spyOnLoggerInfo = jest.spyOn(logger, 'info');
      const spyOnSetCircuitBreakerState = jest.spyOn(globalConfig, 'setCircuitBreakerState');

      const cb = new ExpressCircuitBreaker({
        bucket,
        logger,
        applicationState: globalConfig,
        config: { resourceName: 'transaction-history', threshold },
      });

      cb.halfOpen();

      const req = {} as Request;
      const res = new FakeExpressResponse() as unknown as Response;

      cb.monitor(req, res, next) as Response;
      res.emit('finish');

      expect(next).toHaveBeenCalledTimes(1);
      expect(spyOnSetCircuitBreakerState).toHaveBeenCalledWith(
        'transaction-history-circuit-breaker',
        CircuitBreakerStatus.CLOSED
      );

      expect(spyOnLoggerInfo).toHaveBeenCalledTimes(1);
      expect(spyOnLoggerInfo).toHaveBeenCalledWith({
        msg: 'Successful response while in a HALF_OPEN state. Closing the circuit.',
        status: CircuitBreakerStatus.HALF_OPEN,
      });
    });

    it('should open the circuit again if response 500 INTERNAL SERVER ERROR and circuit is at HALF_OPEN', () => {
      const spyOnLoggerInfo = jest.spyOn(logger, 'info');
      const spyOnBucketSend = jest.spyOn(bucket, 'send');
      const spyOnSetCircuitBreakerState = jest.spyOn(globalConfig, 'setCircuitBreakerState');

      const cb = new ExpressCircuitBreaker({
        bucket,
        logger,
        applicationState: globalConfig,
        config: { resourceName: 'transaction-history', threshold },
      });

      cb.halfOpen();

      const req = {} as Request;
      const res = new FakeExpressResponse({ statusCode: 500 }) as unknown as Response;
      const next = () => {};

      cb.monitor(req, res, next) as Response;
      res.emit('finish');

      expect(spyOnSetCircuitBreakerState).toHaveBeenCalledWith(
        'transaction-history-circuit-breaker',
        CircuitBreakerStatus.HALF_OPEN
      );

      expect(spyOnLoggerInfo).toHaveBeenCalledTimes(1);
      expect(spyOnLoggerInfo).toHaveBeenCalledWith({
        msg: 'Failure response while in a HALF_OPEN state. Opening circuit.',
        status: CircuitBreakerStatus.HALF_OPEN,
      });

      expect(spyOnBucketSend).toHaveBeenCalledWith({
        type: 'NEW_FAILURE',
        payload: { subscriptionId },
      });
    });
  });

  describe('Leaky bucket events', () => {
    describe('THRESHOLD_VIOLATION', () => {
      it('should open the state', () => {
        const circuitBreaker = new ExpressCircuitBreaker({
          bucket,
          logger,
          applicationState,
          config: { resourceName: 'transaction-history', threshold: 10 },
        });

        const spyOnOpen = jest.spyOn(circuitBreaker, 'open');
        const spyOnLoggerInfo = jest.spyOn(logger, 'info');

        bucket.send({ type: 'THRESHOLD_VIOLATION' });

        expect(spyOnOpen).toHaveBeenCalledTimes(1);
        expect(spyOnLoggerInfo).toHaveBeenCalledTimes(1);
        expect(spyOnLoggerInfo).toHaveBeenCalledWith({
          msg: 'Threshold violated. Opening circuit.',
        });
      });
    });

    describe('THRESHOLD_RESTORED', () => {
      it('should move to HALF_OPEN state', () => {
        const circuitBreaker = new ExpressCircuitBreaker({
          bucket,
          logger,
          applicationState,
          config: { resourceName: 'transaction-history', threshold: 10 },
        });

        circuitBreaker.open();

        const spyOnHalfOpen = jest.spyOn(circuitBreaker, 'halfOpen');
        const spyOnLoggerInfo = jest.spyOn(logger, 'info');

        bucket.send({ type: 'THRESHOLD_RESTORED' });

        expect(spyOnHalfOpen).toHaveBeenCalledTimes(1);
        expect(spyOnLoggerInfo).toHaveBeenCalledTimes(1);
        expect(spyOnLoggerInfo).toHaveBeenCalledWith({
          msg: 'Threshold restored. Moving circuit to half-open.',
          status: CircuitBreakerStatus.HALF_OPEN,
        });
      });
    });
  });
});
