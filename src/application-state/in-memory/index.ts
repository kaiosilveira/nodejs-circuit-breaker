import ApplicationState from '..';
import CircuitBreaker, { CircuitBreakerEvents } from '../../circuit-breaker';
import { CircuitBreakerStatus } from '../../circuit-breaker/status';

export default class InMemoryApplicationState implements ApplicationState {
  CIRCUIT_BREAKERS: Object;

  constructor() {
    this.CIRCUIT_BREAKERS = {};
  }

  fetchCircuitBreakerState(circuitBreakerId: string): CircuitBreakerStatus {
    return this.CIRCUIT_BREAKERS[circuitBreakerId];
  }

  setCircuitBreakerState(circuitBreakerId: string, state: CircuitBreakerStatus): void {
    this.CIRCUIT_BREAKERS[circuitBreakerId] = state;
  }

  registerCircuitBreaker(circuitBreaker: CircuitBreaker): void {
    this.CIRCUIT_BREAKERS[circuitBreaker.getIdentifier()] = circuitBreaker.getStatus();
    circuitBreaker.on(CircuitBreakerEvents.CIRCUIT_BREAKER_STATE_UPDATED, data => {
      this.CIRCUIT_BREAKERS[data.circuitBreakerId] = data.newState;
    });
  }
}
