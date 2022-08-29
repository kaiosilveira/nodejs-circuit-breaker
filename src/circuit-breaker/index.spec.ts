import { ChildProcess } from 'child_process';
import EventEmitter from 'events';
import { Request, Response } from 'express';

import CircuitBreaker, { CircuitBreakerStatus } from '.';
import GlobalConfig from '../global-config';
import ILogger from '../monitoring/logger';

class FakeChildProcess extends ChildProcess {
  send() {
    return true;
  }

  on() {
    return this;
  }
}

class FakeLogger implements ILogger {
  info(obj: any): void {}
  error(obj: any): void {}
}

class FakeGlobalConfig implements GlobalConfig {
  CB_OPEN: boolean;

  constructor() {
    this.CB_OPEN = false;
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
  const globalConfig = new FakeGlobalConfig();
  const next = jest.fn();

  afterEach(() => {
    jest.restoreAllMocks();
    next.mockReset();
  });

  describe('initialization', () => {
    it('should register itself with the LeakyBucket', () => {
      const spyOnSend = jest.spyOn(bucket, 'send');

      new CircuitBreaker({
        bucket,
        logger,
        globalConfig,
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

      new CircuitBreaker({
        bucket,
        logger,
        globalConfig,
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

      const cb = new CircuitBreaker({
        bucket,
        logger,
        globalConfig,
        config: { resourceName: 'transaction-history', threshold },
      });

      cb.setState(CircuitBreakerStatus.OPEN);

      const req = {} as Request;
      const res = new FakeExpressResponse() as unknown as Response;
      const next = () => {};

      const result = cb.monitor(req, res, next) as Response;

      expect(result.status).toEqual(500);
      expect(spyOnLoggerInfo).toHaveBeenCalledTimes(1);
      expect(spyOnLoggerInfo).toHaveBeenCalledWith({
        msg: 'Call refused from circuit breaker',
        status: CircuitBreakerStatus.OPEN,
      });
    });

    it('should register success 200 OK response when the state is CLOSED', () => {
      const spyOnLoggerInfo = jest.spyOn(logger, 'info');

      const cb = new CircuitBreaker({
        bucket,
        logger,
        globalConfig,
        config: { resourceName: 'transaction-history', threshold },
      });

      cb.setState(CircuitBreakerStatus.CLOSED);

      const req = {} as Request;
      const res = new FakeExpressResponse() as unknown as Response;

      cb.monitor(req, res, next) as Response;
      res.emit('finish');

      expect(next).toHaveBeenCalledTimes(1);
      expect(spyOnLoggerInfo).toHaveBeenCalledTimes(1);
      expect(spyOnLoggerInfo).toHaveBeenCalledWith({
        msg: 'Successful response',
        status: CircuitBreakerStatus.CLOSED,
      });
    });

    it('should close the circuit again if response has status 200 OK and circuit is at HALF_OPEN', () => {
      const spyOnLoggerInfo = jest.spyOn(logger, 'info');

      const cb = new CircuitBreaker({
        bucket,
        logger,
        globalConfig,
        config: { resourceName: 'transaction-history', threshold },
      });

      cb.halfOpen();

      const req = {} as Request;
      const res = new FakeExpressResponse() as unknown as Response;

      cb.monitor(req, res, next) as Response;
      res.emit('finish');

      expect(next).toHaveBeenCalledTimes(1);
      expect(spyOnLoggerInfo).toHaveBeenCalledTimes(1);
      expect(spyOnLoggerInfo).toHaveBeenCalledWith({
        msg: 'Successful response while in a HALF_OPEN state. Circuit is now closed.',
        status: CircuitBreakerStatus.CLOSED,
      });
    });

    it('should open the circuit again if response 500 INTERNAL SERVER ERROR and circuit is at HALF_OPEN', () => {
      const spyOnLoggerInfo = jest.spyOn(logger, 'info');
      const spyOnBucketSend = jest.spyOn(bucket, 'send');

      const cb = new CircuitBreaker({
        bucket,
        logger,
        globalConfig,
        config: { resourceName: 'transaction-history', threshold },
      });

      cb.halfOpen();

      const req = {} as Request;
      const res = new FakeExpressResponse({ statusCode: 500 }) as unknown as Response;
      const next = () => {};

      cb.monitor(req, res, next) as Response;
      res.emit('finish');

      expect(spyOnLoggerInfo).toHaveBeenCalledTimes(1);
      expect(spyOnLoggerInfo).toHaveBeenCalledWith({
        msg: 'Failure response while in a HALF_OPEN state. Opening circuit.',
        status: CircuitBreakerStatus.OPEN,
      });

      expect(spyOnBucketSend).toHaveBeenCalledWith({
        type: 'NEW_FAILURE',
        payload: { subscriptionId },
      });
    });
  });
});
