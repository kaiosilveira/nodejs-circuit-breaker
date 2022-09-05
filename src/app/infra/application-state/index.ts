import CircuitBreaker from '../../stability/circuit-breaker';
import { CircuitBreakerStatus } from '../../stability/circuit-breaker/status';

export default interface ApplicationState {
  fetchCircuitBreakerState(circuitBreakerId: string): CircuitBreakerStatus;
  registerCircuitBreaker(circuitBreaker: CircuitBreaker): void;
  setCircuitBreakerState({
    circuitBreakerId,
    state,
  }: {
    circuitBreakerId: string;
    state: CircuitBreakerStatus;
  }): void;
}
