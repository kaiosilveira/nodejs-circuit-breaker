import { Request, Response } from 'express';
import AdminController from '.';
import FakeExpressRequest from '../../../../../../test/fakes/express/http/request';
import FakeExpressResponse from '../../../../../../test/fakes/express/http/response/fake';
import FakeApplicationState from '../../../../../app/infra/application-state/fake';
import { CircuitBreakerDescription } from '../../../../../app/stability/circuit-breaker';
import { CircuitBreakerStatus } from '../../../../../app/stability/circuit-breaker/status';

describe('AdminController', () => {
  describe('setCircuitBreakerState', () => {
    it('should return bad request if circuitBreakerId is empty', () => {
      const state = CircuitBreakerStatus.OPEN;
      const body = { circuitBreakerId: '', state };

      const req = new FakeExpressRequest({ body }) as unknown as Request;
      const res = new FakeExpressResponse() as unknown as Response;
      const appState = new FakeApplicationState();

      const ctrl = new AdminController({ applicationState: appState });

      const spyOnStatus = jest.spyOn(res, 'status');
      const spyOnJson = jest.spyOn(res, 'json');
      ctrl.setCircuitBreakerState(req, res) as unknown as Response;

      expect(spyOnStatus).toHaveBeenCalledWith(500);
      expect(spyOnJson).toHaveBeenCalledWith({
        msg: 'Invalid circuitBreakerId. Expected a string.',
      });
    });

    it('should return bad request if state is empty', () => {
      const body = { circuitBreakerId: 'abc', state: '' };

      const req = new FakeExpressRequest({ body }) as unknown as Request;
      const res = new FakeExpressResponse() as unknown as Response;
      const appState = new FakeApplicationState();

      const ctrl = new AdminController({ applicationState: appState });

      const spyOnStatus = jest.spyOn(res, 'status');
      const spyOnJson = jest.spyOn(res, 'json');
      ctrl.setCircuitBreakerState(req, res) as unknown as Response;

      expect(spyOnStatus).toHaveBeenCalledWith(500);
      expect(spyOnJson).toHaveBeenCalledWith({
        msg: 'Invalid state for circuit breaker. Expected one of the following values: OPEN | HALF_OPEN | CLOSED.',
      });
    });

    it('should return bad request if state is not one of the items in the enum', () => {
      const body = { circuitBreakerId: 'abc', state: 'INVALID_STATE' };

      const req = new FakeExpressRequest({ body }) as unknown as Request;
      const res = new FakeExpressResponse() as unknown as Response;
      const appState = new FakeApplicationState();

      const ctrl = new AdminController({ applicationState: appState });

      const spyOnStatus = jest.spyOn(res, 'status');
      const spyOnJson = jest.spyOn(res, 'json');
      ctrl.setCircuitBreakerState(req, res) as unknown as Response;

      expect(spyOnStatus).toHaveBeenCalledWith(500);
      expect(spyOnJson).toHaveBeenCalledWith({
        msg: 'Invalid state for circuit breaker. Expected one of the following values: OPEN | HALF_OPEN | CLOSED.',
      });
    });

    it('should move the circuit breaker to the state provided', () => {
      const circuitBreakerId = 'cb-id';
      const state = CircuitBreakerStatus.OPEN;
      const body = { circuitBreakerId, state };

      const req = new FakeExpressRequest({ body }) as unknown as Request;
      const res = new FakeExpressResponse() as unknown as Response;
      const appState = new FakeApplicationState();

      const spyOnSetCircuitBreakerState = jest.spyOn(appState, 'setCircuitBreakerState');
      const ctrl = new AdminController({ applicationState: appState });

      ctrl.setCircuitBreakerState(req, res);

      expect(spyOnSetCircuitBreakerState).toHaveBeenCalledTimes(1);
      expect(spyOnSetCircuitBreakerState).toHaveBeenCalledWith({ circuitBreakerId, state });
    });
  });

  describe('describeCircuitBreakerStates', () => {
    it('should return the state of all registered circuit breakers', () => {
      const applicationState = new FakeApplicationState();
      const describedCircuitBreakers = [
        {
          resource: 'transaction-history',
          circuitBreakerId: 'transaction-history-cb',
          state: CircuitBreakerStatus.HALF_OPEN,
        },
      ] as unknown as Array<CircuitBreakerDescription>;

      jest
        .spyOn(applicationState, 'describeRegisteredCircuitBreakers')
        .mockReturnValue(describedCircuitBreakers);

      const req = new FakeExpressRequest({ body: {} }) as unknown as Request;
      const res = new FakeExpressResponse() as unknown as Response;

      const spyOnJson = jest.spyOn(res, 'json');

      new AdminController({ applicationState }).describeCircuitBreakerStates(req, res);

      expect(spyOnJson).toHaveBeenCalledWith(describedCircuitBreakers);
    });
  });
});
