import ApplicationState from '..';
import { CircuitBreakerStatus } from '../../circuit-breaker/status';

export default class FakeApplicationState implements ApplicationState {
  circuitBreakerStates: Object;

  constructor() {
    this.circuitBreakerStates = {};
  }

  fetchCircuitBreakerState(circuitBreakerId: string): CircuitBreakerStatus {
    return this.circuitBreakerStates[circuitBreakerId];
  }

  setCircuitBreakerState(circuitBreakerId: string, state: CircuitBreakerStatus): void {
    this.circuitBreakerStates[circuitBreakerId] = state;
  }

  isCircuitBreakerOpen(): boolean {
    return false;
  }

  setCircuitBreakerOpen(_: boolean): void {}
}
