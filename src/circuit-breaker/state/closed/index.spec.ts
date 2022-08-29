import CircuitBreakerClosedState from '.';
import FakeCircuitBreaker from '../../fake';
import { CircuitBreakerStatus } from '../../status';
import FakeLogger from '../../../monitoring/logger/fake';

describe('CircuitBreakerClosedState', () => {
  const logger = new FakeLogger();
  const circuitBreaker = new FakeCircuitBreaker();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should have status CLOSED', () => {
    const closedState = new CircuitBreakerClosedState({ circuitBreaker, logger });
    expect(closedState.status).toEqual(CircuitBreakerStatus.CLOSED);
  });

  describe('handleOkResponse', () => {
    it('should log a successful response', () => {
      const closedState = new CircuitBreakerClosedState({ circuitBreaker, logger });

      const spyOnLogger = jest.spyOn(logger, 'info');
      closedState.handleOkResponse();

      expect(spyOnLogger).toHaveBeenCalledTimes(1);
      expect(spyOnLogger).toHaveBeenCalledWith({
        msg: 'Successful response',
        status: closedState.status,
      });
    });
  });

  describe('handleInternalServerErrorResponse', () => {
    it('should register a failure on the circuit breaker', () => {
      const closedState = new CircuitBreakerClosedState({ circuitBreaker, logger });

      const spyOnRegisterFailure = jest.spyOn(circuitBreaker, 'registerFailure');
      closedState.handleInternalServerErrorResponse();

      expect(spyOnRegisterFailure).toHaveBeenCalledTimes(1);
    });
  });
});
