import ApplicationState from '.';
import circuitBreaker, { CircuitBreakerDescription } from '../../stability/circuit-breaker';
import { CircuitBreakerStatus } from '../../stability/circuit-breaker/status';

export default class FakeApplicationState implements ApplicationState {
  circuitBreakerStates: Object;

  constructor() {
    this.circuitBreakerStates = {};
  }

  describeRegisteredCircuitBreakers(): CircuitBreakerDescription[] {
    return [];
  }

  setCircuitBreakerState(_: { circuitBreakerId: string; state: CircuitBreakerStatus }): void {}

  registerCircuitBreaker(_: circuitBreaker): void {}

  fetchCircuitBreakerState(circuitBreakerId: string): CircuitBreakerStatus {
    return this.circuitBreakerStates[circuitBreakerId];
  }

  isCircuitBreakerOpen(): boolean {
    return false;
  }
}
