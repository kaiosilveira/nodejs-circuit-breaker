import CircuitBreakerHalfOpenState from '.';
import FakeLogger from '../../../../infra/logger/fake';
import FakeCircuitBreaker from '../../fake';
import { CircuitBreakerStatus } from '../../status';

describe('CircuitBreakerHalfOpenState', () => {
  const circuitBreaker = new FakeCircuitBreaker();
  const logger = new FakeLogger();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should have the status HALF_OPEN', () => {
    const state = new CircuitBreakerHalfOpenState({ circuitBreaker, logger });
    expect(state.status).toEqual(CircuitBreakerStatus.HALF_OPEN);
  });

  describe('handleOkResponse', () => {
    it('should close the circuit and log the fact', () => {
      const state = new CircuitBreakerHalfOpenState({ circuitBreaker, logger });

      const spyOnLoggerInfo = jest.spyOn(logger, 'info');
      const spyOnClose = jest.spyOn(circuitBreaker, 'close');
      state.handleOkResponse();

      expect(spyOnClose).toHaveBeenCalledTimes(1);
      expect(spyOnLoggerInfo).toHaveBeenCalledTimes(1);
      expect(spyOnLoggerInfo).toHaveBeenCalledWith({
        msg: 'Successful response while in a HALF_OPEN state. Closing the circuit.',
        status: state.status,
      });
    });
  });

  describe('handleInternalServerErrorResponse', () => {
    it('should open the state, log and register the failure', () => {
      const state = new CircuitBreakerHalfOpenState({ circuitBreaker, logger });

      const spyOnLoggerInfo = jest.spyOn(logger, 'info');
      const spyOnOpen = jest.spyOn(circuitBreaker, 'open');
      const spyOnRegisterFailure = jest.spyOn(circuitBreaker, 'registerFailure');
      state.handleInternalServerErrorResponse();

      expect(spyOnOpen).toHaveBeenCalledTimes(1);
      expect(spyOnRegisterFailure).toHaveBeenCalledTimes(1);
      expect(spyOnLoggerInfo).toHaveBeenCalledTimes(1);
      expect(spyOnLoggerInfo).toHaveBeenCalledWith({
        msg: 'Failure response while in a HALF_OPEN state. Opening circuit.',
        status: state.status,
      });
    });
  });
});
