import { Request, Response } from 'express';

import ExpressCircuitBreaker from '.';
import { LeakyBucketMessageTypes } from '../../../app/infra/leaky-bucket/messages';
import FakeLogger from '../../../app/infra/logger/fake';
import { CircuitBreakerEvents } from '../../../app/stability/circuit-breaker';
import { CircuitBreakerStatus } from '../../../app/stability/circuit-breaker/status';
import FakeChildProcess from '../../../../test/fakes/nodejs/child-process/fake';
import FakeExpressResponse from '../../../../test/fakes/express/http/response/fake';

describe('CircuitBreaker', () => {
  const threshold = 10;
  const subscriptionId = 'transaction-history-circuit-breaker';
  const bucket = new FakeChildProcess();
  const logger = new FakeLogger();
  const next = jest.fn();

  afterEach(() => {
    jest.restoreAllMocks();
    next.mockReset();
  });

  describe('initialization', () => {
    it('should register itself with the LeakyBucket', () => {
      const spyOnSend = jest.spyOn(bucket, 'send');

      new ExpressCircuitBreaker({
        config: { resourceName: 'transaction-history', threshold },
        bucket,
        logger,
      });

      expect(spyOnSend).toHaveBeenCalledTimes(1);
      expect(spyOnSend).toHaveBeenCalledWith({
        type: LeakyBucketMessageTypes.REGISTER,
        payload: { subscriptionId, threshold },
      });
    });

    it('should register message listeners on the LeakyBucket', () => {
      const spyOnOn = jest.spyOn(bucket, 'on');

      new ExpressCircuitBreaker({
        config: { resourceName: 'transaction-history', threshold },
        bucket,
        logger,
      });

      expect(spyOnOn).toHaveBeenCalledTimes(1);
      expect(spyOnOn).toHaveBeenCalledWith('message', expect.anything());
    });
  });

  describe('monitor', () => {
    const threshold = 10;
    const bucket = new FakeChildProcess();
    const logger = new FakeLogger();

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return INTERNAL_SERVER_ERROR 500 if state is OPEN', () => {
      const spyOnLoggerInfo = jest.spyOn(logger, 'info');

      const circuitBreaker = new ExpressCircuitBreaker({
        config: { resourceName: 'transaction-history', threshold },
        bucket,
        logger,
      });

      const spyOnEmit = jest.spyOn(circuitBreaker, 'emit');
      circuitBreaker.open();

      const req = {} as Request;
      const res = new FakeExpressResponse() as unknown as Response;
      const next = () => {};

      const result = circuitBreaker.monitor(req, res, next) as Response;

      expect(result.status).toEqual(500);
      expect(spyOnEmit).toHaveBeenCalledWith('CIRCUIT_BREAKER_STATE_UPDATED', {
        circuitBreakerId: circuitBreaker.subscriptionId,
        newState: CircuitBreakerStatus.OPEN,
      });

      expect(spyOnLoggerInfo).toHaveBeenCalledTimes(1);
      expect(spyOnLoggerInfo).toHaveBeenCalledWith({
        msg: 'Call refused from circuit breaker',
        status: CircuitBreakerStatus.OPEN,
      });
    });

    it('should register success 200 OK response when the state is CLOSED', () => {
      const spyOnLoggerInfo = jest.spyOn(logger, 'info');

      const cb = new ExpressCircuitBreaker({
        config: { resourceName: 'transaction-history', threshold },
        bucket,
        logger,
      });

      cb.close();

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

      const circuitBreaker = new ExpressCircuitBreaker({
        config: { resourceName: 'transaction-history', threshold },
        bucket,
        logger,
      });

      circuitBreaker.halfOpen();

      const spyOnEmit = jest.spyOn(circuitBreaker, 'emit');

      const req = {} as Request;
      const res = new FakeExpressResponse() as unknown as Response;
      circuitBreaker.monitor(req, res, next) as Response;
      res.emit('finish');

      expect(spyOnEmit).toHaveBeenCalledWith('CIRCUIT_BREAKER_STATE_UPDATED', {
        circuitBreakerId: circuitBreaker.subscriptionId,
        newState: CircuitBreakerStatus.CLOSED,
      });

      expect(next).toHaveBeenCalledTimes(1);
      expect(spyOnLoggerInfo).toHaveBeenCalledTimes(1);
      expect(spyOnLoggerInfo).toHaveBeenCalledWith({
        msg: 'Successful response while in a HALF_OPEN state. Closing the circuit.',
        status: CircuitBreakerStatus.HALF_OPEN,
      });
    });

    it('should open the circuit again if response 500 INTERNAL SERVER ERROR and circuit is at HALF_OPEN', () => {
      const spyOnLoggerInfo = jest.spyOn(logger, 'info');
      const spyOnBucketSend = jest.spyOn(bucket, 'send');

      const circuitBreaker = new ExpressCircuitBreaker({
        config: { resourceName: 'transaction-history', threshold },
        bucket,
        logger,
      });

      circuitBreaker.halfOpen();

      const spyOnEmit = jest.spyOn(circuitBreaker, 'emit');
      const req = {} as Request;
      const res = new FakeExpressResponse({ statusCode: 500 }) as unknown as Response;
      const next = () => {};
      circuitBreaker.monitor(req, res, next) as Response;
      res.emit('finish');

      expect(spyOnEmit).toHaveBeenCalledWith('CIRCUIT_BREAKER_STATE_UPDATED', {
        circuitBreakerId: circuitBreaker.subscriptionId,
        newState: CircuitBreakerStatus.OPEN,
      });

      expect(spyOnLoggerInfo).toHaveBeenCalledTimes(1);
      expect(spyOnLoggerInfo).toHaveBeenCalledWith({
        msg: 'Failure response while in a HALF_OPEN state. Opening circuit.',
        status: CircuitBreakerStatus.HALF_OPEN,
      });

      expect(spyOnBucketSend).toHaveBeenCalledWith({
        type: LeakyBucketMessageTypes.NEW_FAILURE,
        payload: { subscriptionId },
      });
    });
  });

  describe('Leaky bucket events', () => {
    describe('THRESHOLD_VIOLATION', () => {
      it('should open the state', () => {
        const circuitBreaker = new ExpressCircuitBreaker({
          config: { resourceName: 'transaction-history', threshold: 10 },
          bucket,
          logger,
        });

        const spyOnOpen = jest.spyOn(circuitBreaker, 'open');
        const spyOnLoggerInfo = jest.spyOn(logger, 'info');

        bucket.send({ type: LeakyBucketMessageTypes.THRESHOLD_VIOLATION });

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
          config: { resourceName: 'transaction-history', threshold: 10 },
          bucket,
          logger,
        });

        circuitBreaker.open();

        const spyOnHalfOpen = jest.spyOn(circuitBreaker, 'halfOpen');
        const spyOnEmit = jest.spyOn(circuitBreaker, 'emit');
        const spyOnLoggerInfo = jest.spyOn(logger, 'info');

        bucket.send({ type: LeakyBucketMessageTypes.THRESHOLD_RESTORED });

        expect(spyOnEmit).toHaveBeenCalledTimes(1);
        expect(spyOnEmit).toHaveBeenCalledWith(CircuitBreakerEvents.CIRCUIT_BREAKER_STATE_UPDATED, {
          circuitBreakerId: circuitBreaker.subscriptionId,
          newState: CircuitBreakerStatus.HALF_OPEN,
        });

        expect(spyOnHalfOpen).toHaveBeenCalledTimes(1);
        expect(spyOnLoggerInfo).toHaveBeenCalledTimes(1);
        expect(spyOnLoggerInfo).toHaveBeenCalledWith({
          msg: 'Threshold restored. Moving circuit to half-open.',
          status: CircuitBreakerStatus.HALF_OPEN,
        });
      });
    });
  });

  describe('describe', () => {
    it('should describe itself', () => {
      const circuitBreaker = new ExpressCircuitBreaker({
        bucket,
        logger,
        config: { resourceName: 'transactions', threshold: 10 },
      });

      circuitBreaker.halfOpen();

      const result = circuitBreaker.describe();
      expect(result).toEqual({
        circuitBreakerId: 'transactions-circuit-breaker',
        state: CircuitBreakerStatus.HALF_OPEN,
        resource: 'transactions',
      });
    });
  });
});
