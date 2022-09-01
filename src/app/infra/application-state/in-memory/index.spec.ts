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
});
