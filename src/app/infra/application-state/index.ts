import CircuitBreaker, { CircuitBreakerDescription } from '../../stability/circuit-breaker';
import { CircuitBreakerStatus } from '../../stability/circuit-breaker/status';

export default interface ApplicationState {
  fetchCircuitBreakerState(circuitBreakerId: string): CircuitBreakerStatus;
  registerCircuitBreaker(circuitBreaker: CircuitBreaker): void;
  describeRegisteredCircuitBreakers(): Array<CircuitBreakerDescription>;
  setCircuitBreakerState({
    circuitBreakerId,
    state,
  }: {
    circuitBreakerId: string;
    state: CircuitBreakerStatus;
  }): void;
}
