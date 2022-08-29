import CircuitBreakerOpenState from '.';
import FakeLogger from '../../../monitoring/logger/fake';
import FakeCircuitBreaker from '../../fake';
import { CircuitBreakerStatus } from '../../status';

describe('CircuitBreakerOpenState', () => {
  const logger = new FakeLogger();
  const circuitBreaker = new FakeCircuitBreaker();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should have the status OPEN', () => {
    const state = new CircuitBreakerOpenState({ circuitBreaker, logger });

    expect(state.status).toEqual(CircuitBreakerStatus.OPEN);
  });

  describe('handleInternalServerErrorResponse', () => {
    it('should register the failure', () => {
      const logger = new FakeLogger();
      const circuitBreaker = new FakeCircuitBreaker();

      const spyOnRegisterFailure = jest.spyOn(circuitBreaker, 'registerFailure');
      const state = new CircuitBreakerOpenState({ circuitBreaker, logger });
      state.handleInternalServerErrorResponse();

      expect(spyOnRegisterFailure).toHaveBeenCalledTimes(1);
    });
  });
});
