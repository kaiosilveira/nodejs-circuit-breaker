import ApplicationState from '..';
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
}
