import ApplicationState from '..';
import circuitBreaker from '../../circuit-breaker';
import { CircuitBreakerStatus } from '../../circuit-breaker/status';

export default class FakeApplicationState implements ApplicationState {
  circuitBreakerStates: Object;

  constructor() {
    this.circuitBreakerStates = {};
  }

  registerCircuitBreaker(_: circuitBreaker): void {}

  fetchCircuitBreakerState(circuitBreakerId: string): CircuitBreakerStatus {
    return this.circuitBreakerStates[circuitBreakerId];
  }

  isCircuitBreakerOpen(): boolean {
    return false;
  }

  setCircuitBreakerOpen(_: boolean): void {}
}
