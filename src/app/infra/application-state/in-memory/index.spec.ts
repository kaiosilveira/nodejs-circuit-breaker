import InMemoryApplicationState from '.';
import { CircuitBreakerEvents } from '../../../stability/circuit-breaker';
import FakeCircuitBreaker from '../../../stability/circuit-breaker/fake';
import { CircuitBreakerStatus } from '../../../stability/circuit-breaker/status';

describe('InMemoryApplicationState', () => {
  describe('registerCircuitBreaker', () => {
    it('should register a circuit breaker', () => {
      const appState = new InMemoryApplicationState();
      const circuitBreaker = new FakeCircuitBreaker();

      appState.registerCircuitBreaker(circuitBreaker);
      expect(appState.fetchCircuitBreakerState(circuitBreaker.getIdentifier())).toEqual(
        circuitBreaker.getStatus()
      );
    });

    it('should add a listener to CIRCUIT_BREAKER_STATE_CHANGED message and react to it updating the corresponding circuit breaker to the new state', () => {
      const appState = new InMemoryApplicationState();
      const circuitBreaker = new FakeCircuitBreaker();

      appState.registerCircuitBreaker(circuitBreaker);

      circuitBreaker.halfOpen();
      circuitBreaker.emit(CircuitBreakerEvents.CIRCUIT_BREAKER_STATE_UPDATED, {
        circuitBreakerId: circuitBreaker.getIdentifier(),
        newState: CircuitBreakerStatus.HALF_OPEN,
      });

      expect(appState.fetchCircuitBreakerState(circuitBreaker.getIdentifier())).toEqual(
        CircuitBreakerStatus.HALF_OPEN
      );
    });
  });

  describe('fetchCircuitBreakerState', () => {
    it('should return the current state for a registered circuit breaker', () => {
      const appState = new InMemoryApplicationState();
      const circuitBreaker = new FakeCircuitBreaker();

      appState.registerCircuitBreaker(circuitBreaker);

      expect(appState.fetchCircuitBreakerState(circuitBreaker.getIdentifier())).toEqual(
        circuitBreaker.getStatus()
      );
    });
  });

  describe('setCircuitBreakerState', () => {
    it('should throw an error if circuit breaker is not registered', () => {
      const circuitBreakerId = String(Math.random() * 99999);
      const appState = new InMemoryApplicationState();
      expect(() =>
        appState.setCircuitBreakerState({ circuitBreakerId, state: CircuitBreakerStatus.OPEN })
      ).toThrow('No registered circuit breakers were found for the given identifier');
    });

    it('should set a circuit breaker to the OPEN state', () => {
      const circuitBreakerId = String(Math.random() * 99999);
      const circuitBreaker = new FakeCircuitBreaker({ id: circuitBreakerId });
      const appState = new InMemoryApplicationState();
      appState.registerCircuitBreaker(circuitBreaker);

      const spyOnClose = jest.spyOn(circuitBreaker, 'close');
      appState.setCircuitBreakerState({ circuitBreakerId, state: CircuitBreakerStatus.CLOSED });

      expect(spyOnClose).toHaveBeenCalledTimes(1);
    });

    it('should set a circuit breaker to the OPEN state', () => {
      const circuitBreakerId = String(Math.random() * 99999);
      const appState = new InMemoryApplicationState();
      const circuitBreaker = new FakeCircuitBreaker({ id: circuitBreakerId });
      appState.registerCircuitBreaker(circuitBreaker);

      const spyOnOpen = jest.spyOn(circuitBreaker, 'open');
      appState.setCircuitBreakerState({ circuitBreakerId, state: CircuitBreakerStatus.OPEN });

      expect(spyOnOpen).toHaveBeenCalledTimes(1);
    });

    it('should set a circuit breaker to the HALF_OPEN state', () => {
      const circuitBreakerId = String(Math.random() * 99999);
      const circuitBreaker = new FakeCircuitBreaker({ id: circuitBreakerId });
      const appState = new InMemoryApplicationState();
      appState.registerCircuitBreaker(circuitBreaker);

      const spyOnHalfOpen = jest.spyOn(circuitBreaker, 'halfOpen');
      appState.setCircuitBreakerState({ circuitBreakerId, state: CircuitBreakerStatus.HALF_OPEN });

      expect(spyOnHalfOpen).toHaveBeenCalledTimes(1);
    });
  });
});
